/**
 * Stripe webhook handler — runs outside RWSDK middleware to preserve raw body.
 */
import type Stripe from "stripe";
import { env } from "cloudflare:workers";
import { getStripe, getCryptoProvider } from "@/utils/stripe";

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
      console.log("Checkout session completed:", event.data.object.id);
      break;
    case "payment_intent.succeeded":
      console.log("Payment intent succeeded:", event.data.object.id);
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
