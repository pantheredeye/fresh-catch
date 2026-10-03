import { Hono } from "hono";
import type Stripe from "stripe";
import type { Bindings, Variables } from "@/types";
import { db, setupDb } from "@/lib/db";
import type { Order } from "@/lib/db";
import { getCryptoProvider, getStripe } from "@/lib/stripe";
import { recordPayment, recordRefund } from "@/features/orders/queries";
import { formatCents } from "@/features/orders/components";
import { appendMessage } from "@/features/requests/queries";
import { PLATFORM_METADATA_VALUE } from "./checkout";
import { resolveStripeConfig } from "./config";
import { sendPaymentReceipt } from "./receipt";

export const stripeWebhookRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Stripe **Connect** webhook. Charges are created directly on Evan's
 * connected account, so these arrive as connected-account events with
 * `event.account` set.
 *
 * Mounted first in `src/index.ts`, ahead of the device-token and session
 * middleware: Hono runs handlers in registration order, so a route
 * registered before `app.use("*")` never sees them, which keeps the raw body
 * untouched (signature verification needs the exact bytes) and stops the
 * webhook minting a device cookie. The trade is that `setupDb` hasn't run
 * either — the handler does it itself, same as v1's `ensureDb()`.
 *
 * Ack policy: 400 only for a request we can't authenticate. Anything that
 * goes wrong *after* verification is logged and still acked 200, because a
 * retry would only replay the same bug.
 */
stripeWebhookRoutes.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.text("Missing stripe-signature header", 400);

  const { STRIPE_SECRET_KEY: secretKey, STRIPE_WEBHOOK_SECRET: webhookSecret } = c.env;
  if (!secretKey || !webhookSecret) {
    console.error(
      "[CONFIG ERROR] Stripe webhook hit with STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET unset — set with: wrangler secret put <NAME>",
    );
    return c.text("Stripe webhook not configured", 500);
  }

  const rawBody = await c.req.raw.text();

  let event: Stripe.Event;
  try {
    event = await getStripe(secretKey).webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      getCryptoProvider(),
    );
  } catch (err) {
    console.error("[payments] webhook signature verification failed:", err instanceof Error ? err.message : err);
    return c.text("Webhook verification failed", 400);
  }

  await setupDb(c.env);

  try {
    if (await fromAnotherAccount(c.env, event)) return c.json({ received: true });
    await dispatchEvent(c.env, event);
  } catch (err) {
    console.error(`[payments] handler failed for ${event.type} (${event.id}):`, err);
  }

  return c.json({ received: true });
});

/** A Connect endpoint can only ever hear about accounts we're connected to, but an app should still say so. */
async function fromAnotherAccount(env: Bindings, event: Stripe.Event): Promise<boolean> {
  if (!event.account) return false;
  const config = await resolveStripeConfig(env);
  if (!config || config.connectedAccountId === event.account) return false;

  console.warn(`[payments] ignoring ${event.type} from unrecognised account ${event.account}`);
  return true;
}

async function dispatchEvent(env: Bindings, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(env, event.data.object);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(env, event.data.object);
      break;
    case "payment_intent.payment_failed":
      console.log(`[payments] payment intent failed: ${event.data.object.id}`);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    default:
      console.log(`[payments] unhandled webhook event type: ${event.type}`);
  }
}

/**
 * The order this event is about. Metadata is written by our own server at
 * session creation, so it's trustworthy — and single-vendor v2 needs no
 * `resolveOrgFromMetadata` hop (v1 had one; it's deliberately gone).
 */
async function orderFromMetadata(metadata: Stripe.Metadata | null | undefined): Promise<Order | null> {
  if (metadata?.platform !== PLATFORM_METADATA_VALUE) {
    console.log(`[payments] ignoring event — wrong platform: ${metadata?.platform}`);
    return null;
  }

  const orderId = metadata.orderId;
  if (!orderId) {
    console.error("[payments] event metadata missing orderId");
    return null;
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) console.error(`[payments] no order found for ${orderId}`);
  return order;
}

/** Idempotency: Stripe retries, and `payment_intent.succeeded` doubles as a backup for the same money. */
async function alreadyRecorded(stripePaymentId: string): Promise<boolean> {
  const existing = await db.payment.findFirst({ where: { stripePaymentId } });
  return existing != null;
}

function intentIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** First money on an order that asked for a deposit is the deposit. */
function paymentTypeFor(order: Order): "deposit" | "payment" {
  return order.depositAmount != null && order.depositAmount > 0 && order.amountPaid === 0 ? "deposit" : "payment";
}

async function settle(env: Bindings, order: Order, amountCents: number, stripePaymentId: string): Promise<void> {
  const isDeposit = paymentTypeFor(order) === "deposit";
  const { order: updated } = await recordPayment(order, {
    amountCents,
    method: "stripe",
    notes: null,
    type: isDeposit ? "deposit" : "payment",
    stripePaymentId,
    stripePaymentIntentId: stripePaymentId,
  });

  console.log(
    `[payments] recorded ${isDeposit ? "deposit" : "payment"} of ${amountCents}c for order ${order.orderNumber}` +
      (updated.paidAt ? " (fully paid)" : ""),
  );

  // The thread is the customer-facing record of the whole loop, so the
  // payment lands there too — the order card's "Paid" badge is derived from
  // `Order.paidAt` and updates on its own (R7: no fifth request status).
  if (updated.requestId) {
    const remaining = updated.totalDue != null ? Math.max(updated.totalDue - updated.amountPaid, 0) : 0;
    const body =
      `Payment of ${formatCents(amountCents)} received — thank you!` +
      (remaining > 0 ? ` ${formatCents(remaining)} remaining.` : "");
    await appendMessage(updated.requestId, "vendor", body);
  }

  try {
    await sendPaymentReceipt(env, updated, { amountCents, isDeposit });
  } catch (err) {
    console.error("[payments] receipt email failed:", err);
  }
}

/** Primary success path. */
async function handleCheckoutSessionCompleted(env: Bindings, session: Stripe.Checkout.Session): Promise<void> {
  const paymentIntentId = intentIdOf(session.payment_intent);
  if (paymentIntentId && (await alreadyRecorded(paymentIntentId))) {
    console.log(`[payments] intent ${paymentIntentId} already recorded, skipping`);
    return;
  }

  const order = await orderFromMetadata(session.metadata);
  if (!order) return;

  const amountCents = session.amount_total ?? 0;
  if (amountCents <= 0) {
    console.log(`[payments] checkout session ${session.id} had no amount, skipping`);
    return;
  }

  await settle(env, order, amountCents, paymentIntentId ?? session.id);
}

/** Backup for the above — same dedup key, so whichever lands first wins. */
async function handlePaymentIntentSucceeded(env: Bindings, intent: Stripe.PaymentIntent): Promise<void> {
  if (await alreadyRecorded(intent.id)) {
    console.log(`[payments] intent ${intent.id} already recorded, skipping (backup)`);
    return;
  }

  const order = await orderFromMetadata(intent.metadata);
  if (!order) return;

  const amountCents = intent.amount_received;
  if (amountCents <= 0) return;

  await settle(env, order, amountCents, intent.id);
}

/**
 * Refunds are issued from the Stripe dashboard (Evan is merchant of record —
 * there's no in-app refund button), so this exists to keep our ledger honest
 * when he does. The charge carries no metadata of ours, so the order is
 * resolved through the original payment.
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const refundAmount = charge.amount_refunded;
  if (!refundAmount || refundAmount <= 0) return;

  const paymentIntentId = intentIdOf(charge.payment_intent);
  if (!paymentIntentId) {
    console.error(`[payments] charge.refunded missing payment_intent: ${charge.id}`);
    return;
  }

  const original = await db.payment.findFirst({ where: { stripePaymentId: paymentIntentId } });
  if (!original) {
    console.log(`[payments] no original payment for intent ${paymentIntentId}, skipping refund`);
    return;
  }

  const alreadyRefunded = await db.payment.findFirst({
    where: { orderId: original.orderId, stripePaymentId: charge.id, type: "refund" },
  });
  if (alreadyRefunded) {
    console.log(`[payments] refund already recorded for charge ${charge.id}, skipping`);
    return;
  }

  const order = await db.order.findUnique({ where: { id: original.orderId } });
  if (!order) {
    console.error(`[payments] order ${original.orderId} missing for refund of ${charge.id}`);
    return;
  }

  const { order: updated } = await recordRefund(order, { amountCents: refundAmount, stripePaymentId: charge.id });
  console.log(
    `[payments] refund of ${refundAmount}c recorded for order ${order.orderNumber}` +
      (order.paidAt && !updated.paidAt ? " (no longer fully paid)" : ""),
  );
}
