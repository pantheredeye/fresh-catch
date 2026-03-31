/**
 * Stripe webhook handler — runs outside RWSDK middleware to preserve raw body.
 */
import type Stripe from "stripe";
import { env } from "cloudflare:workers";
import { getStripe, getCryptoProvider } from "@/utils/stripe";
import { db, setupDb } from "@/db";
import { sendPaymentReceivedEmail } from "@/utils/email";

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
    return new Response("Webhook verification failed", {
      status: 400,
    });
  }

  console.log(`Stripe webhook received: ${event.type} (${event.id})`);

  // Resolve org early from Stripe Connect account ID
  const stripeAccountId = event.account;
  if (!stripeAccountId) {
    console.error(`Webhook event ${event.type} missing account (not a Connect event?)`);
    return new Response("Missing connected account", { status: 400 });
  }

  await ensureDb();

  const org = await db.organization.findFirst({
    where: { stripeAccountId },
    select: { id: true, name: true },
  });
  if (!org) {
    console.error(`No organization found for Stripe account ${stripeAccountId}`);
    return new Response("Unknown Stripe account", { status: 400 });
  }

  try {
    await dispatchWebhookEvent(event, org.id);
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
async function dispatchWebhookEvent(event: Stripe.Event, orgId: string): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        orgId,
      );
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
        orgId,
      );
      break;
    case "payment_intent.payment_failed":
      console.log("Payment intent failed:", event.data.object.id);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge, orgId);
      break;
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account, orgId);
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
  orgId: string,
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

  const order = await db.order.findFirst({
    where: { id: orderId, organizationId: orgId },
    include: { organization: { select: { name: true } } },
  });
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

  // Send PaymentReceived email to customer
  if (order.contactEmail) {
    try {
      const remainingBalance = (order.totalDue ?? 0) - newAmountPaid;
      await sendPaymentReceivedEmail({
        to: order.contactEmail,
        orderNumber: order.orderNumber,
        amountPaid: amountPaidCents,
        totalDue: order.totalDue ?? 0,
        remainingBalance: Math.max(0, remainingBalance),
        paymentMethod: "Stripe",
        businessName: order.organization.name,
      });
    } catch (emailError) {
      console.error("Failed to send PaymentReceived email:", emailError);
    }
  }
}

/**
 * Handle payment_intent.succeeded — backup handler.
 * Only creates a Payment if checkout.session.completed hasn't already.
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  orgId: string,
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

  // Dedup: skip if checkout.session.completed already handled this
  const existing = await db.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });
  if (existing) {
    console.log(`Payment already recorded for intent ${paymentIntent.id}, skipping (backup)`);
    return;
  }

  const order = await db.order.findFirst({ where: { id: orderId, organizationId: orgId } });
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

/**
 * Handle charge.refunded — create negative Payment record and decrement amountPaid.
 * Clears paidAt if the order is no longer fully paid after the refund.
 */
async function handleChargeRefunded(charge: Stripe.Charge, orgId: string): Promise<void> {
  const refundAmount = charge.amount_refunded;
  if (!refundAmount || refundAmount <= 0) {
    console.log("Charge refund with zero amount, skipping:", charge.id);
    return;
  }

  // Find the original payment by stripePaymentId (the PaymentIntent ID)
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    console.error("charge.refunded missing payment_intent:", charge.id);
    return;
  }

  const originalPayment = await db.payment.findFirst({
    where: { stripePaymentId: paymentIntentId },
  });
  if (!originalPayment) {
    console.log(
      `No original payment found for intent ${paymentIntentId}, skipping refund`,
    );
    return;
  }

  // Dedup: skip if we already recorded a refund for this charge
  const existingRefund = await db.payment.findFirst({
    where: {
      orderId: originalPayment.orderId,
      stripePaymentId: charge.id,
      type: "refund",
    },
  });
  if (existingRefund) {
    console.log(`Refund already recorded for charge ${charge.id}, skipping`);
    return;
  }

  const order = await db.order.findFirst({
    where: { id: originalPayment.orderId, organizationId: orgId },
  });
  if (!order) {
    console.error(
      `Order not found for refund: ${originalPayment.orderId}`,
    );
    return;
  }

  const newAmountPaid = order.amountPaid - refundAmount;
  const wasFullyPaid = order.paidAt != null;
  const stillFullyPaid =
    order.totalDue != null && newAmountPaid >= order.totalDue;

  await db.payment.create({
    data: {
      orderId: order.id,
      amount: -refundAmount,
      method: "stripe",
      type: "refund",
      stripePaymentId: charge.id,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: {
      amountPaid: newAmountPaid,
      ...(wasFullyPaid && !stillFullyPaid ? { paidAt: null } : {}),
    },
  });

  console.log(
    `Refund recorded: ${refundAmount}c for order ${order.orderNumber}` +
      (wasFullyPaid && !stillFullyPaid ? " (no longer fully paid)" : ""),
  );
}

/**
 * Handle account.updated — update org stripeOnboardingComplete status.
 * Sets onboarding complete when charges_enabled AND details_submitted are true.
 */
async function handleAccountUpdated(account: Stripe.Account, orgId: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, stripeAccountId: true, stripeOnboardingComplete: true },
  });
  if (!org) {
    console.error(`Organization not found for id ${orgId}`);
    return;
  }

  if (org.stripeAccountId !== account.id) {
    console.warn(
      `Cross-org mismatch in account.updated: resolved org ${org.id} has stripeAccountId ${org.stripeAccountId} but event account is ${account.id}`,
    );
    return;
  }

  const onboardingComplete =
    account.charges_enabled === true && account.details_submitted === true;

  if (onboardingComplete !== org.stripeOnboardingComplete) {
    await db.organization.update({
      where: { id: org.id },
      data: { stripeOnboardingComplete: onboardingComplete },
    });

    console.log(
      `Stripe onboarding ${onboardingComplete ? "complete" : "incomplete"} for org ${org.name}`,
    );
  } else {
    console.log(
      `Stripe onboarding status unchanged for org ${org.name}: ${onboardingComplete}`,
    );
  }
}
