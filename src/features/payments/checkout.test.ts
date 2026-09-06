import { describe, expect, it } from "vitest";
import { buildCheckoutParams, checkoutAmountFor, MINIMUM_CHARGE_CENTS } from "./checkout";

function order(overrides: Partial<Parameters<typeof checkoutAmountFor>[0]> = {}) {
  return { totalDue: 5000, price: 5000, amountPaid: 0, depositAmount: null, ...overrides };
}

describe("checkoutAmountFor", () => {
  it("charges the full balance with a 5% application fee by default", () => {
    expect(checkoutAmountFor(order(), 500)).toEqual({ chargeCents: 5000, feeCents: 250, isDeposit: false });
  });

  it("charges only what's outstanding after a partial in-person payment", () => {
    expect(checkoutAmountFor(order({ amountPaid: 2000 }), 500)).toEqual({
      chargeCents: 3000,
      feeCents: 150,
      isDeposit: false,
    });
  });

  it("charges the deposit first, with a proportional slice of the fee", () => {
    expect(checkoutAmountFor(order({ depositAmount: 1500 }), 500)).toEqual({
      chargeCents: 1500,
      feeCents: 75,
      isDeposit: true,
    });
  });

  it("charges the remaining balance once the deposit is in", () => {
    const amount = checkoutAmountFor(order({ depositAmount: 1500, amountPaid: 1500 }), 500);
    expect(amount).toEqual({ chargeCents: 3500, feeCents: 175, isDeposit: false });
  });

  it("returns null when the order is settled or unpriced", () => {
    expect(checkoutAmountFor(order({ amountPaid: 5000 }), 500)).toBeNull();
    expect(checkoutAmountFor(order({ amountPaid: 6000 }), 500)).toBeNull();
    expect(checkoutAmountFor(order({ totalDue: null, price: null }), 500)).toBeNull();
  });

  it("falls back to price when totalDue was never set", () => {
    expect(checkoutAmountFor(order({ totalDue: null, price: 1000 }), 500)?.chargeCents).toBe(1000);
  });

  it("never asks for more than the outstanding balance, even with an oversized deposit", () => {
    const amount = checkoutAmountFor(order({ totalDue: 1000, price: 1000, depositAmount: 4000 }), 500);
    expect(amount?.chargeCents).toBe(1000);
  });
});

describe("buildCheckoutParams", () => {
  const base = { successUrl: "https://example.test/requests/r1?checkout=success", cancelUrl: "https://example.test/requests/r1?checkout=cancel" };

  it("builds a direct charge with an application fee and no transfer_data", () => {
    const params = buildCheckoutParams({ id: "order-1", orderNumber: 12 }, { chargeCents: 5000, feeCents: 250, isDeposit: false }, base);

    expect(params.mode).toBe("payment");
    expect(params.payment_intent_data?.application_fee_amount).toBe(250);
    // Destination charges would make the platform merchant of record — explicitly not what we want.
    expect(params.payment_intent_data).not.toHaveProperty("transfer_data");
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(5000);
    expect(params.line_items?.[0]?.price_data?.product_data?.name).toBe("Order #12");
    expect(params.success_url).toBe(base.successUrl);
    expect(params.cancel_url).toBe(base.cancelUrl);
  });

  it("carries platform + order metadata on the session and the payment intent, with no orgId", () => {
    const params = buildCheckoutParams({ id: "order-1", orderNumber: 12 }, { chargeCents: 5000, feeCents: 250, isDeposit: false }, base);

    expect(params.metadata).toEqual({ platform: "fresh-catch", orderId: "order-1", orderNumber: "12" });
    expect(params.payment_intent_data?.metadata).toEqual(params.metadata);
    expect(params.metadata).not.toHaveProperty("orgId");
  });

  it("labels a deposit charge as such", () => {
    const params = buildCheckoutParams({ id: "order-1", orderNumber: 7 }, { chargeCents: 1500, feeCents: 75, isDeposit: true }, base);
    expect(params.line_items?.[0]?.price_data?.product_data?.name).toBe("Deposit for Order #7");
  });
});

describe("MINIMUM_CHARGE_CENTS", () => {
  it("matches Stripe's USD floor", () => {
    expect(MINIMUM_CHARGE_CENTS).toBe(50);
  });
});
