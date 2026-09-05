import { describe, expect, it } from "vitest";
import { parseConfirmOrderForm, parseMarkPaidForm } from "./validation";

describe("parseConfirmOrderForm", () => {
  it("converts dollars to integer cents", () => {
    const result = parseConfirmOrderForm({ price: "45.50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priceCents).toBe(4550);
  });

  it("defaults deposit to null when blank", () => {
    const result = parseConfirmOrderForm({ price: "45", deposit: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.depositCents).toBeNull();
  });

  it("converts a provided deposit to cents", () => {
    const result = parseConfirmOrderForm({ price: "45", deposit: "10.00" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.depositCents).toBe(1000);
  });

  it("rejects a zero or negative price", () => {
    expect(parseConfirmOrderForm({ price: "0" }).success).toBe(false);
    expect(parseConfirmOrderForm({ price: "-5" }).success).toBe(false);
  });

  it("rejects a non-numeric price", () => {
    const result = parseConfirmOrderForm({ price: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.price).toBeTruthy();
  });

  it("rejects a zero or negative deposit when provided", () => {
    expect(parseConfirmOrderForm({ price: "45", deposit: "0" }).success).toBe(false);
  });

  it("trims and nulls adminNotes when blank", () => {
    const result = parseConfirmOrderForm({ price: "45", adminNotes: "  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.adminNotes).toBeNull();
  });
});

describe("parseMarkPaidForm", () => {
  it("converts dollars to integer cents and validates method", () => {
    const result = parseMarkPaidForm({ amount: "20.00", method: "cash" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountCents).toBe(2000);
      expect(result.data.method).toBe("cash");
    }
  });

  it("rejects an invalid payment method", () => {
    const result = parseMarkPaidForm({ amount: "20", method: "check" });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative amount", () => {
    expect(parseMarkPaidForm({ amount: "0", method: "cash" }).success).toBe(false);
    expect(parseMarkPaidForm({ amount: "-1", method: "cash" }).success).toBe(false);
  });
});
