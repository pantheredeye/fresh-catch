import { describe, expect, it } from "vitest";
import { CATCH_FIELD_LIMITS, parsePricesForm, parsePublishForm } from "./validation";

function publishForm(overrides: Record<string, unknown> = {}) {
  return {
    headline: "Big Haul",
    summary: "A great catch today.",
    itemsJson: JSON.stringify([{ name: "Mahi Mahi", note: "Fresh" }]),
    rawTranscript: "mahi mahi, fresh",
    ...overrides,
  };
}

describe("parsePublishForm", () => {
  it("accepts a valid submission", () => {
    const result = parsePublishForm(publishForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content.headline).toBe("Big Haul");
      expect(result.data.content.items).toEqual([{ name: "Mahi Mahi", note: "Fresh" }]);
    }
  });

  it("rejects a blank headline", () => {
    const result = parsePublishForm(publishForm({ headline: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a headline over its limit", () => {
    const result = parsePublishForm(publishForm({ headline: "x".repeat(CATCH_FIELD_LIMITS.headline + 1) }));
    expect(result.success).toBe(false);
  });

  it("rejects unparseable itemsJson", () => {
    const result = parsePublishForm(publishForm({ itemsJson: "not json" }));
    expect(result.success).toBe(false);
  });

  it("rejects an empty items array", () => {
    const result = parsePublishForm(publishForm({ itemsJson: "[]" }));
    expect(result.success).toBe(false);
  });

  it("rejects an item missing a name", () => {
    const result = parsePublishForm(publishForm({ itemsJson: JSON.stringify([{ name: "", note: "x" }]) }));
    expect(result.success).toBe(false);
  });

  it("accepts an item with a blank note", () => {
    const result = parsePublishForm(publishForm({ itemsJson: JSON.stringify([{ name: "Cod", note: "" }]) }));
    expect(result.success).toBe(true);
  });

  it("accepts an item with an LLM-extracted priceCents", () => {
    const result = parsePublishForm(
      publishForm({ itemsJson: JSON.stringify([{ name: "Cod", note: "", priceCents: 1500 }]) }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content.items[0].priceCents).toBe(1500);
  });

  it("accepts an item with no price mentioned (priceCents omitted)", () => {
    const result = parsePublishForm(publishForm({ itemsJson: JSON.stringify([{ name: "Cod", note: "" }]) }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content.items[0].priceCents).toBeUndefined();
  });

  it("rejects a non-numeric priceCents", () => {
    const result = parsePublishForm(
      publishForm({ itemsJson: JSON.stringify([{ name: "Cod", note: "", priceCents: "15.00" }]) }),
    );
    expect(result.success).toBe(false);
  });
});

describe("parsePricesForm", () => {
  it("accepts blank prices as null and unchecked boxes as not sold out", () => {
    const result = parsePricesForm({}, 2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        { priceCents: null, soldOut: false },
        { priceCents: null, soldOut: false },
      ]);
    }
  });

  it("parses a dollar price into cents and a checked box as sold out", () => {
    const result = parsePricesForm({ price_0: "15.50", soldOut_0: "on" }, 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0]).toEqual({ priceCents: 1550, soldOut: true });
  });

  it("rejects an invalid price", () => {
    const result = parsePricesForm({ price_0: "abc" }, 1);
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = parsePricesForm({ price_0: "-5" }, 1);
    expect(result.success).toBe(false);
  });
});
