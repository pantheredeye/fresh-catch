import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { createRequest, getRequestWithMessages } from "@/features/requests/queries";
import type { RequestInput } from "@/features/requests/validation";
import { confirmOrderForRequest, recordPayment } from "./queries";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

function fishInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    requestType: "fish",
    species: `Salmon ${crypto.randomUUID()}`,
    quantity: "2 lbs",
    notes: null,
    contactName: "Jamie",
    contactEmail: null,
    contactPhone: null,
    ...overrides,
  };
}

describe("confirmOrderForRequest", () => {
  it("creates an order, snapshots items, and stamps the request as confirmed", async () => {
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const order = await confirmOrderForRequest(request, { priceCents: 4500, depositCents: null, adminNotes: null });

    expect(order.requestId).toBe(request.id);
    expect(order.price).toBe(4500);
    expect(order.totalDue).toBe(4500);
    expect(order.status).toBe("confirmed");
    expect(JSON.parse(order.items)).toMatchObject({ species: request.species, quantity: "2 lbs" });

    const updated = await getRequestWithMessages(request.id);
    expect(updated?.quotedPriceCents).toBe(4500);
    expect(updated?.status).toBe("confirmed");
  });

  it("allocates increasing order numbers across requests", async () => {
    const requestA = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const requestB = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const orderA = await confirmOrderForRequest(requestA, { priceCents: 1000, depositCents: null, adminNotes: null });
    const orderB = await confirmOrderForRequest(requestB, { priceCents: 2000, depositCents: null, adminNotes: null });

    expect(orderB.orderNumber).toBeGreaterThan(orderA.orderNumber);
  });

  it("carries a deposit through to depositAmount", async () => {
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const order = await confirmOrderForRequest(request, { priceCents: 5000, depositCents: 1500, adminNotes: "call ahead" });
    expect(order.depositAmount).toBe(1500);
    expect(order.adminNotes).toBe("call ahead");
  });
});

describe("recordPayment", () => {
  async function confirmedOrder(priceCents: number) {
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    return confirmOrderForRequest(request, { priceCents, depositCents: null, adminNotes: null });
  }

  it("bumps amountPaid and leaves paidAt unset for a partial payment", async () => {
    const order = await confirmedOrder(5000);
    const { order: updated, payment } = await recordPayment(order, { amountCents: 2000, method: "cash", notes: null });

    expect(updated.amountPaid).toBe(2000);
    expect(updated.paidAt).toBeNull();
    expect(payment.method).toBe("cash");
    expect(payment.type).toBe("payment");
  });

  it("stamps paidAt once the running total meets totalDue", async () => {
    const order = await confirmedOrder(5000);
    const { order: afterFirst } = await recordPayment(order, { amountCents: 3000, method: "venmo", notes: null });
    expect(afterFirst.paidAt).toBeNull();

    const { order: afterSecond } = await recordPayment(afterFirst, { amountCents: 2000, method: "zelle", notes: "final" });
    expect(afterSecond.amountPaid).toBe(5000);
    expect(afterSecond.paidAt).not.toBeNull();
  });

  it("records an overpayment without erroring and still stamps paidAt", async () => {
    const order = await confirmedOrder(1000);
    const { order: updated } = await recordPayment(order, { amountCents: 1500, method: "other", notes: null });
    expect(updated.amountPaid).toBe(1500);
    expect(updated.paidAt).not.toBeNull();
  });
});
