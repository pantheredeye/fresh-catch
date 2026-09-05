import type { Bindings } from "@/types";
import { db } from "@/lib/db";

/**
 * Everything the Stripe paths need, resolved in one place so every caller
 * has the same answer to "is payments turned on?".
 *
 * Payments are a flippable module (issue #60): with `STRIPE_SECRET_KEY`
 * unset this returns `null`, the "Request payment" action doesn't render,
 * and #65's confirm + mark-paid-in-person flow carries on untouched.
 */
export type StripeConfig = {
  secretKey: string;
  /** Evan's connected account — charges are created *on* it (direct charges), so he's merchant of record. */
  connectedAccountId: string;
  /** Platform's cut, taken as `application_fee_amount`. */
  platformFeeBps: number;
};

/**
 * Connected account comes from `STRIPE_CONNECT_ACCOUNT_ID` (the addendum's
 * one-time dashboard/OAuth connect — no in-app onboarding UI), falling back
 * to `Vendor.stripeAccountId` for whoever prefers it in the DB.
 */
export async function resolveStripeConfig(env: Bindings): Promise<StripeConfig | null> {
  if (!env.STRIPE_SECRET_KEY) return null;

  const vendor = await db.vendor.findFirst();
  const connectedAccountId = env.STRIPE_CONNECT_ACCOUNT_ID ?? vendor?.stripeAccountId ?? null;
  if (!connectedAccountId) return null;

  return {
    secretKey: env.STRIPE_SECRET_KEY,
    connectedAccountId,
    platformFeeBps: vendor?.platformFeeBps ?? 500,
  };
}
