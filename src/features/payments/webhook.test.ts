import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setupDb } from "@/lib/db";
import type { Order } from "@/lib/db";
import type { Bindings } from "@/types";
import { createRequest, getRequestWithMessages } from "@/features/requests/queries";
import { confirmOrderForRequest } from "@/features/orders/queries";
import * as emailLib from "@/lib/email";
import app from "../../index";

const sendEmailMock = vi.spyOn(emailLib, "sendEmail").mockResolvedValue(true);

const WEBHOOK_SECRET = "whsec_test_secret";
const CONNECTED_ACCOUNT = "acct_evan";

const stripeEnv = () =>
  ({
    ...(env as unknown as Bindings),
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_CONNECT_ACCOUNT_ID: CONNECTED_ACCOUNT,
  }) as unknown as Bindings;

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

beforeEach(() => {
  sendEmailMock.mockClear();
});

/** Signs exactly the way Stripe does, so `constructEventAsync` runs for real — no SDK mock. */
async function signedHeaders(payload: string, secret = WEBHOOK_SECRET): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { "Content-Type": "application/json", "stripe-signature": `t=${timestamp},v1=${hex}` };
}

function eventBody(type: string, object: unknown, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: `evt_${crypto.randomUUID()}`,
    object: "event",
    type,
    account: CONNECTED_ACCOUNT,
    api_version: "2026-02-25.clover",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    ...overrides,
  });
}

async function postEvent(payload: string, options: { secret?: string; env?: Bindings } = {}) {
  return app.request(
    "/webhooks/stripe",
    { method: "POST", body: payload, headers: await signedHeaders(payload, options.secret) },
    options.env ?? stripeEnv(),
  );
}

async function orderOnThread(
  priceCents = 5000,
  depositCents: number | null = null,
  contactEmail: string | null = "customer@example.com",
): Promise<{ order: Order; requestId: string }> {
  const request = await createRequest(
    {
      requestType: "fish",
      species: `Salmon ${crypto.randomUUID()}`,
      quantity: "2 lbs",
      notes: null,
      contactName: "Jamie",
      contactEmail,
      contactPhone: null,
    },
    { deviceToken: crypto.randomUUID(), userId: null },
  );
  const order = await confirmOrderForRequest(request, { priceCents, depositCents, adminNotes: null });
  return { order, requestId: request.id };
}

function checkoutSession(order: Order, paymentIntentId: string, amountTotal: number) {
  return {
    id: `cs_${crypto.randomUUID()}`,
    object: "checkout.session",
    payment_intent: paymentIntentId,
    amount_total: amountTotal,
    metadata: { platform: "fresh-catch", orderId: order.id, orderNumber: String(order.orderNumber) },
  };
}

describe("POST /webhooks/stripe — authentication", () => {
  it("400s without a stripe-signature header", async () => {
    const res = await app.request("/webhooks/stripe", { method: "POST", body: "{}" }, stripeEnv());
    expect(res.status).toBe(400);
  });

  it("400s on a signature made with the wrong secret", async () => {
    const res = await postEvent(eventBody("checkout.session.completed", {}), { secret: "whsec_wrong" });
    expect(res.status).toBe(400);
  });

  it("400s when the body was tampered with after signing", async () => {
    const payload = eventBody("checkout.session.completed", {});
    const headers = await signedHeaders(payload);
    const res = await app.request(
      "/webhooks/stripe",
      { method: "POST", body: payload.replace("checkout.session.completed", "charge.refunded"), headers },
      stripeEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("500s when Stripe is not configured — payments off means no webhook", async () => {
    const payload = eventBody("checkout.session.completed", {});
    const res = await app.request(
      "/webhooks/stripe",
      { method: "POST", body: payload, headers: await signedHeaders(payload) },
      { ...(env as unknown as Bindings), STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined },
    );
    expect(res.status).toBe(500);
  });

  it("runs ahead of the cookie middleware — no device token is minted", async () => {
    const res = await postEvent(eventBody("some.unhandled.event", {}));
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });
});

describe("POST /webhooks/stripe — checkout.session.completed", () => {
  it("records the payment, marks the order paid, notes the thread and emails a receipt", async () => {
    const { order, requestId } = await orderOnThread(5000);
    const intentId = `pi_${crypto.randomUUID()}`;

    const res = await postEvent(eventBody("checkout.session.completed", checkoutSession(order, intentId, 5000)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.amountPaid).toBe(5000);
    expect(updated?.paidAt).not.toBeNull();
    expect(updated?.stripePaymentIntentId).toBe(intentId);
    expect(updated?.payments).toHaveLength(1);
    expect(updated?.payments[0]).toMatchObject({ method: "stripe", type: "payment", stripePaymentId: intentId });

    const thread = await getRequestWithMessages(requestId);
    expect(thread?.messages.at(-1)?.body).toContain("$50.00");
    expect(thread?.messages.at(-1)?.sender).toBe("vendor");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [, message] = sendEmailMock.mock.calls[0];
    expect(message.to).toBe("customer@example.com");
    expect(message.subject).toContain(`#${order.orderNumber}`);
    expect(message.html).toContain("$50.00");
    expect(message.html).toContain("Paid in full");
  });

  it("is idempotent — a replayed event records nothing twice", async () => {
    const { order } = await orderOnThread(5000);
    const intentId = `pi_${crypto.randomUUID()}`;
    const session = checkoutSession(order, intentId, 5000);

    await postEvent(eventBody("checkout.session.completed", session));
    sendEmailMock.mockClear();
    const res = await postEvent(eventBody("checkout.session.completed", session));

    expect(res.status).toBe(200);
    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.payments).toHaveLength(1);
    expect(updated?.amountPaid).toBe(5000);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("books a first payment on a deposit order as a deposit and leaves a balance", async () => {
    const { order } = await orderOnThread(5000, 1500);

    await postEvent(
      eventBody("checkout.session.completed", checkoutSession(order, `pi_${crypto.randomUUID()}`, 1500)),
    );

    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.payments[0]?.type).toBe("deposit");
    expect(updated?.amountPaid).toBe(1500);
    expect(updated?.paidAt).toBeNull();
    expect(sendEmailMock.mock.calls[0][1].html).toContain("Balance remaining");
  });

  it("ignores an event from another platform's integration", async () => {
    const { order } = await orderOnThread(5000);
    const session = { ...checkoutSession(order, `pi_${crypto.randomUUID()}`, 5000), metadata: { platform: "other" } };

    const res = await postEvent(eventBody("checkout.session.completed", session));

    expect(res.status).toBe(200);
    expect((await db.order.findUnique({ where: { id: order.id } }))?.amountPaid).toBe(0);
  });

  it("acks an event whose order has vanished rather than asking Stripe to retry", async () => {
    const session = {
      id: "cs_missing",
      payment_intent: `pi_${crypto.randomUUID()}`,
      amount_total: 5000,
      metadata: { platform: "fresh-catch", orderId: crypto.randomUUID() },
    };
    const res = await postEvent(eventBody("checkout.session.completed", session));
    expect(res.status).toBe(200);
  });

  it("ignores events from an account we aren't connected to", async () => {
    const { order } = await orderOnThread(5000);
    const payload = eventBody(
      "checkout.session.completed",
      checkoutSession(order, `pi_${crypto.randomUUID()}`, 5000),
      { account: "acct_someone_else" },
    );

    const res = await postEvent(payload);

    expect(res.status).toBe(200);
    expect((await db.order.findUnique({ where: { id: order.id } }))?.amountPaid).toBe(0);
  });
});

describe("POST /webhooks/stripe — payment_intent.succeeded (backup)", () => {
  it("records the payment when checkout.session.completed never arrived", async () => {
    const { order } = await orderOnThread(4000);
    const intentId = `pi_${crypto.randomUUID()}`;

    const res = await postEvent(
      eventBody("payment_intent.succeeded", {
        id: intentId,
        object: "payment_intent",
        amount_received: 4000,
        metadata: { platform: "fresh-catch", orderId: order.id, orderNumber: String(order.orderNumber) },
      }),
    );

    expect(res.status).toBe(200);
    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.payments).toHaveLength(1);
    expect(updated?.paidAt).not.toBeNull();
  });

  it("no-ops when checkout already recorded the same intent", async () => {
    const { order } = await orderOnThread(4000);
    const intentId = `pi_${crypto.randomUUID()}`;

    await postEvent(eventBody("checkout.session.completed", checkoutSession(order, intentId, 4000)));
    await postEvent(
      eventBody("payment_intent.succeeded", {
        id: intentId,
        amount_received: 4000,
        metadata: { platform: "fresh-catch", orderId: order.id },
      }),
    );

    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.payments).toHaveLength(1);
    expect(updated?.amountPaid).toBe(4000);
  });
});

describe("POST /webhooks/stripe — charge.refunded", () => {
  it("reverses the ledger and clears paidAt", async () => {
    const { order } = await orderOnThread(5000);
    const intentId = `pi_${crypto.randomUUID()}`;
    await postEvent(eventBody("checkout.session.completed", checkoutSession(order, intentId, 5000)));

    const chargeId = `ch_${crypto.randomUUID()}`;
    const res = await postEvent(
      eventBody("charge.refunded", {
        id: chargeId,
        object: "charge",
        payment_intent: intentId,
        amount_refunded: 5000,
      }),
    );

    expect(res.status).toBe(200);
    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.amountPaid).toBe(0);
    expect(updated?.paidAt).toBeNull();
    expect(updated?.payments).toHaveLength(2);
    expect(updated?.payments.find((p) => p.type === "refund")?.amount).toBe(-5000);
  });

  it("is idempotent on a replayed refund", async () => {
    const { order } = await orderOnThread(5000);
    const intentId = `pi_${crypto.randomUUID()}`;
    await postEvent(eventBody("checkout.session.completed", checkoutSession(order, intentId, 5000)));

    const refund = eventBody("charge.refunded", {
      id: `ch_${crypto.randomUUID()}`,
      payment_intent: intentId,
      amount_refunded: 5000,
    });
    await postEvent(refund);
    await postEvent(refund);

    const updated = await db.order.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(updated?.payments.filter((p) => p.type === "refund")).toHaveLength(1);
    expect(updated?.amountPaid).toBe(0);
  });

  it("acks a refund for a charge we never recorded", async () => {
    const res = await postEvent(
      eventBody("charge.refunded", { id: "ch_unknown", payment_intent: "pi_unknown", amount_refunded: 100 }),
    );
    expect(res.status).toBe(200);
  });
});
