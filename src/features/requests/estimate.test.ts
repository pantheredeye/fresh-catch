import { describe, expect, it } from "vitest";
import {
  confirmPrefill,
  estimateMessageBody,
  isResolved,
  quoteMessageBody,
  resolutionLine,
  summarizeEstimate,
  type ResolvableItem,
} from "./estimate";

function item(overrides: Partial<ResolvableItem> = {}): ResolvableItem {
  return {
    species: "Halibut",
    quantity: "2 lbs",
    notes: null,
    status: "requested",
    priceCents: null,
    marketRate: false,
    vendorNote: null,
    ...overrides,
  };
}

describe("isResolved", () => {
  it("is false for an untouched line and true once status, price, or market rate is set", () => {
    expect(isResolved(item())).toBe(false);
    expect(isResolved(item({ status: "available" }))).toBe(true);
    expect(isResolved(item({ priceCents: 1000 }))).toBe(true);
    expect(isResolved(item({ marketRate: true }))).toBe(true);
  });
});

describe("resolutionLine", () => {
  it("renders status plus price, market rate, or TBD", () => {
    expect(resolutionLine(item({ status: "available", priceCents: 2450 }))).toBe("Halibut — 2 lbs: available · $24.50");
    expect(resolutionLine(item({ status: "available", marketRate: true }))).toBe("Halibut — 2 lbs: available · market rate");
    expect(resolutionLine(item({ status: "requested" }))).toBe("Halibut — 2 lbs: pending · price TBD");
  });

  it("drops the price on unavailable lines and appends the vendor note", () => {
    expect(resolutionLine(item({ status: "unavailable", priceCents: 2450, vendorNote: "none this week" }))).toBe(
      "Halibut — 2 lbs: unavailable (none this week)",
    );
  });

  it("flags a priced market-rate line as an estimate", () => {
    expect(resolutionLine(item({ status: "available", priceCents: 1800, marketRate: true }))).toBe(
      "Halibut — 2 lbs: available · $18.00 (market rate)",
    );
  });
});

describe("summarizeEstimate", () => {
  it("sums known prices and counts unpriced lines, excluding unavailable", () => {
    const summary = summarizeEstimate([
      item({ status: "available", priceCents: 2000 }),
      item({ status: "substituted", priceCents: 1500 }),
      item({ marketRate: true }),
      item({ status: "unavailable", priceCents: 9900 }),
    ]);
    expect(summary).toEqual({ knownCents: 3500, pricedCount: 2, unpricedCount: 1, unavailableCount: 1 });
  });
});

describe("estimateMessageBody", () => {
  it("lists every line and the partial total", () => {
    const body = estimateMessageBody([
      item({ species: "Halibut", status: "available", priceCents: 2400 }),
      item({ species: "Snapper", quantity: null, marketRate: true }),
      item({ species: "Trout", quantity: null, status: "unavailable" }),
    ]);
    expect(body).toContain("Halibut — 2 lbs: available · $24.00");
    expect(body).toContain("Snapper: pending · market rate");
    expect(body).toContain("Trout: unavailable");
    expect(body).toContain("Estimated total so far: $24.00 — 1 item still to be priced.");
  });

  it("uses a plain total when everything is priced and a pricing-to-come line when nothing is", () => {
    expect(estimateMessageBody([item({ priceCents: 1000 }), item({ priceCents: 500 })])).toContain(
      "Estimated total: $15.00.",
    );
    expect(estimateMessageBody([item(), item()])).toContain("Pricing to come on 2 items.");
  });
});

describe("quoteMessageBody", () => {
  it("keeps the bare #65 message when no line is resolved", () => {
    expect(quoteMessageBody({ price: 4550, depositAmount: 1000 }, [item()])).toBe(
      "Quoted $45.50 for this order. Deposit of $10.00 requested.",
    );
  });

  it("appends the resolution, unavailable lines included, once any line is resolved", () => {
    const body = quoteMessageBody({ price: 2400, depositAmount: null }, [
      item({ species: "Halibut", status: "available", priceCents: 2400 }),
      item({ species: "Trout", quantity: null, status: "unavailable", vendorNote: "try next week" }),
    ]);
    expect(body).toContain("Quoted $24.00 for this order.");
    expect(body).toContain("Halibut — 2 lbs: available · $24.00");
    expect(body).toContain("Trout: unavailable (try next week)");
  });
});

describe("confirmPrefill", () => {
  it("is empty with no priced items", () => {
    expect(confirmPrefill([item(), item({ marketRate: true })])).toEqual({});
  });

  it("sums priced lines (unavailable excluded) and flags the unpriced remainder", () => {
    const prefill = confirmPrefill([
      item({ priceCents: 2000, status: "available" }),
      item({ marketRate: true }),
      item({ status: "unavailable", priceCents: 9900 }),
    ]);
    expect(prefill.priceDollars).toBe("20.00");
    expect(prefill.priceHelperText).toContain("1 priced item");
    expect(prefill.priceHelperText).toContain("1 item not yet priced");
  });

  it("pre-fills the full sum when every live line is priced", () => {
    const prefill = confirmPrefill([item({ priceCents: 2050 }), item({ priceCents: 1000 })]);
    expect(prefill.priceDollars).toBe("30.50");
    expect(prefill.priceHelperText).toBe("Pre-filled from item prices. Edit as needed.");
  });
});
