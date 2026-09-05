import { describe, expect, it } from "vitest";
import { CATCH_FIELD_LIMITS, parsePublishForm } from "./validation";

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
});
