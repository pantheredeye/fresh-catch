import type Stripe from "stripe";
import type { Bindings } from "@/types";
import { db } from "@/lib/db";
import type { Order } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import type { StripeConfig } from "./config";

/** Stripe rejects charges under 50¢ (USD). */
export const MINIMUM_CHARGE_CENTS = 50;

/** Every event we write carries this, so a stray webhook from another integration is trivially ignorable. */
export const PLATFORM_METADATA_VALUE = "fresh-catch";

export type CheckoutAmount = { chargeCents: number; feeCents: number; isDeposit: boolean };

/**
 * What to charge right now: the deposit when one is set and nothing has been
 * paid yet, otherwise whatever is still outstanding. The application fee is
 * a straight `platformFeeBps` cut of that amount — charging a deposit
 * therefore collects a proportional slice of the fee, not the whole thing.
 *
 * Returns `null` when there's nothing left to collect.
 */
export function checkoutAmountFor(
  order: Pick<Order, "totalDue" | "price" | "amountPaid" | "depositAmount">,
  platformFeeBps: number,
): CheckoutAmount | null {
  const total = order.totalDue ?? order.price;
  if (total == null) return null;

  const outstanding = total - order.amountPaid;
  if (outstanding <= 0) return null;

  const isDeposit = order.depositAmount != null && order.depositAmount > 0 && order.amountPaid === 0;
  const chargeCents = isDeposit ? Math.min(order.depositAmount!, outstanding) : outstanding;

  return { chargeCents, feeCents: Math.round((chargeCents * platformFeeBps) / 10000), isDeposit };
}

/**
 * **Direct charge** params (epic #51 addendum Q3). The session is created on
 * Evan's connected account — he is merchant of record, carrying his own
 * refunds, disputes, taxes and 1099-K — and the platform takes only
 * `application_fee_amount`. Deliberately no `transfer_data.destination`:
 * that's the destination-charge shape v1 used, and it makes the platform
 * merchant of record.
 *
 * Metadata carries no `orgId` — v2 is single-vendor, so the webhook resolves
 * an order directly instead of v1's `resolveOrgFromMetadata` hop.
 */
export function buildCheckoutParams(
  order: Pick<Order, "id" | "orderNumber">,
  amount: CheckoutAmount,
  urls: { successUrl: string; cancelUrl: string },
): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    platform: PLATFORM_METADATA_VALUE,
    orderId: order.id,
    orderNumber: String(order.orderNumber),
  };
  const name = amount.isDeposit ? `Deposit for Order #${order.orderNumber}` : `Order #${order.orderNumber}`;

  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount.chargeCents,
          product_data: { name },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: amount.feeCents,
      metadata,
    },
    metadata,
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
  };
}

export type CheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; reason: "nothing-due" | "below-minimum" | "no-url" | "stripe-error" };

/**
 * Creates the Checkout session and snapshots what we charged onto the Order.
 * The returned URL is a plain link — Evan can post it into the thread, text
 * it, or read it out; that shareability is the vendor-initiated case from
 * the issue's addendum, not a separate feature.
 */
export async function createCheckoutForOrder(
  env: Bindings,
  config: StripeConfig,
  order: Order,
  requestId: string,
): Promise<CheckoutResult> {
  const amount = checkoutAmountFor(order, config.platformFeeBps);
  if (!amount) return { ok: false, reason: "nothing-due" };
  if (amount.chargeCents < MINIMUM_CHARGE_CENTS) return { ok: false, reason: "below-minimum" };

  const base = `${env.APP_URL}/requests/${requestId}`;
  const params = buildCheckoutParams(order, amount, {
    successUrl: `${base}?checkout=success`,
    cancelUrl: `${base}?checkout=cancel`,
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe(config.secretKey).checkout.sessions.create(params, {
      stripeAccount: config.connectedAccountId,
    });
  } catch (err) {
    console.error("[payments] checkout session creation failed:", err);
    return { ok: false, reason: "stripe-error" };
  }

  if (!session.url) return { ok: false, reason: "no-url" };

  await db.order.update({
    where: { id: order.id },
    data: {
      stripeCheckoutSessionId: session.id,
      platformFeeBps: config.platformFeeBps,
      platformFee: amount.feeCents,
    },
  });

  return { ok: true, url: session.url, sessionId: session.id };
}
