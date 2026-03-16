/**
 * Stripe webhook handler — runs outside RWSDK middleware to preserve raw body.
 */
import type Stripe from "stripe";
import { env } from "cloudflare:workers";
import { getStripe, getCryptoProvider } from "@/utils/stripe";
import { db, setupDb } from "@/db";

/**
 * Handle incoming Stripe webhook events.
 * Verifies signature, logs event type, and dispatches to handlers.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const webhookSecret = (env as unknown as Record<string, string>)
    .STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  const secretKey = (env as unknown as Record<string, string>)
    .STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY not configured");
    return new Response("Stripe not configured", { status: 500 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  const stripe = getStripe(secretKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      getCryptoProvider(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  console.log(`Stripe webhook received: ${event.type} (${event.id})`);

  try {
    await dispatchWebhookEvent(event);
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err);
    // Still return 200 — Stripe should not retry on handler errors
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Dispatch webhook event to the appropriate handler.
 * Add new event handlers here as needed.
 */
async function dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
      );
      break;
    case "payment_intent.payment_failed":
      console.log("Payment intent failed:", event.data.object.id);
      break;
    case "charge.refunded":
      console.log("Charge refunded:", event.data.object.id);
      break;
    case "account.updated":
      console.log("Connected account updated:", event.data.object.id);
      break;
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

/** Ensure db is initialized (webhook runs before normal middleware). */
async function ensureDb(): Promise<void> {
  if (!db) {
    await setupDb(env);
  }
}

/**
 * Handle checkout.session.completed — primary payment success handler.
 * Creates Payment record, increments order.amountPaid, sets paidAt if fully paid.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const metadata = session.metadata;
  if (!metadata?.platform || metadata.platform !== "fresh-catch") {
    console.log("Ignoring checkout session — wrong platform:", metadata?.platform);
    return;
  }

  const { orderId } = metadata;
  if (!orderId) {
    console.error("checkout.session.completed missing orderId in metadata");
    return;
  }

  await ensureDb();

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.error(`Order not found for checkout session: ${orderId}`);
    return;
  }

  const amountPaidCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Dedup: skip if we already recorded a payment for this PaymentIntent
  if (paymentIntentId) {
    const existing = await db.payment.findFirst({
      where: { stripePaymentId: paymentIntentId },
    });
    if (existing) {
      console.log(`Payment already recorded for intent ${paymentIntentId}, skipping`);
      return;
    }
  }

  // Determine type: deposit if order has depositAmount and this is the first payment
  const isDeposit =
    order.depositAmount != null &&
    order.depositAmount > 0 &&
    order.amountPaid === 0;
  const paymentType = isDeposit ? "deposit" : "payment";

  // Create Payment + update Order atomically
  const newAmountPaid = order.amountPaid + amountPaidCents;
  const fullyPaid =
    order.totalDue != null && newAmountPaid >= order.totalDue;

  await db.payment.create({
    data: {
      orderId,
      amount: amountPaidCents,
      method: "stripe",
      type: paymentType,
      stripePaymentId: paymentIntentId,
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: {
      amountPaid: newAmountPaid,
      stripePaymentIntentId: paymentIntentId,
      ...(fullyPaid ? { paidAt: new Date() } : {}),
    },
  });

  console.log(
    `Payment recorded: ${paymentType} of ${amountPaidCents}c for order ${order.orderNumber}` +
      (fullyPaid ? " (fully paid)" : ""),
  );
}

/**
 * Handle payment_intent.succeeded — backup handler.
 * Only creates a Payment if checkout.session.completed hasn't already.
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const metadata = paymentIntent.metadata;
  if (!metadata?.platform || metadata.platform !== "fresh-catch") {
    console.log("Ignoring payment_intent — wrong platform:", metadata?.platform);
    return;
  }

  const { orderId } = metadata;
  if (!orderId) {
    console.error("payment_intent.succeeded missing orderId in metadata");
    return;
  }

  await ensureDb();

  // Dedup: skip if checkout.session.completed already handled this
  const existing = await db.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });
  if (existing) {
    console.log(`Payment already recorded for intent ${paymentIntent.id}, skipping (backup)`);
    return;
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.error(`Order not found for payment_intent: ${orderId}`);
    return;
  }

  const amountPaidCents = paymentIntent.amount_received;
  const isDeposit =
    order.depositAmount != null &&
    order.depositAmount > 0 &&
    order.amountPaid === 0;
  const paymentType = isDeposit ? "deposit" : "payment";

  const newAmountPaid = order.amountPaid + amountPaidCents;
  const fullyPaid =
    order.totalDue != null && newAmountPaid >= order.totalDue;

  await db.payment.create({
    data: {
      orderId,
      amount: amountPaidCents,
      method: "stripe",
      type: paymentType,
      stripePaymentId: paymentIntent.id,
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: {
      amountPaid: newAmountPaid,
      stripePaymentIntentId: paymentIntent.id,
      ...(fullyPaid ? { paidAt: new Date() } : {}),
    },
  });

  console.log(
    `Payment recorded (backup): ${paymentType} of ${amountPaidCents}c for order ${order.orderNumber}` +
      (fullyPaid ? " (fully paid)" : ""),
  );
}
