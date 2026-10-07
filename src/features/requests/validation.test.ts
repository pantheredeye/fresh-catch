import { describe, expect, it } from "vitest";
import { FIELD_LIMITS, parseMessageForm, parseRequestForm, parseStatusUpdate } from "./validation";

function fishFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "fish",
    species: "Halibut",
    quantity: "2 lbs",
    notes: "",
    contactName: "Jamie",
    contactEmail: "",
    contactPhone: "901-555-0100",
    ...overrides,
  };
}

function questionFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "question",
    notes: "Do you have salmon this week?",
    contactName: "Jamie",
    contactEmail: "",
    contactPhone: "901-555-0100",
    ...overrides,
  };
}

describe("parseRequestForm", () => {
  it("accepts a minimal fish request (phone only)", () => {
    const result = parseRequestForm(fishFields());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        requestType: "fish",
        items: [{ species: "Halibut", quantity: "2 lbs", notes: null, isCustom: false }],
        notes: null,
        contactName: "Jamie",
        contactEmail: null,
        contactPhone: "901-555-0100",
      });
    }
  });

  it("requires at least one of email/phone", () => {
    const result = parseRequestForm(fishFields({ contactPhone: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.contactEmail).toBeTruthy();
  });

  it("uses speciesOther when species is the Other sentinel, flagged isCustom", () => {
    const result = parseRequestForm(fishFields({ species: "__other", speciesOther: " Wahoo " }));
    expect(result.success && result.data.items[0].species).toBe("Wahoo");
    expect(result.success && result.data.items[0].isCustom).toBe(true);
  });

  it("requires species for a fish request", () => {
    const result = parseRequestForm(fishFields({ species: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.species).toBeTruthy();
  });

  it("accepts a question request with no items", () => {
    const result = parseRequestForm(questionFields({ species: "ignored", quantity: "ignored" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestType).toBe("question");
      expect(result.data.items).toEqual([]);
      expect(result.data.notes).toBe("Do you have salmon this week?");
    }
  });

  it("requires notes for a question request", () => {
    const result = parseRequestForm(questionFields({ notes: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.notes).toBeTruthy();
  });

  it("requires contactName", () => {
    const result = parseRequestForm(fishFields({ contactName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.contactName).toBeTruthy();
  });

  it("rejects a malformed email but allows a blank one", () => {
    const bad = parseRequestForm(fishFields({ contactEmail: "not-an-email" }));
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.contactEmail).toBeTruthy();

    const blank = parseRequestForm(fishFields({ contactEmail: "" }));
    expect(blank.success).toBe(true);
  });

  it("enforces each field limit", () => {
    expect(parseRequestForm(fishFields({ species: "x".repeat(FIELD_LIMITS.species + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ quantity: "x".repeat(FIELD_LIMITS.quantity + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ notes: "x".repeat(FIELD_LIMITS.notes + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ contactName: "x".repeat(FIELD_LIMITS.contactName + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ contactPhone: "x".repeat(FIELD_LIMITS.contactPhone + 1) })).success).toBe(false);
  });
});

describe("parseMessageForm", () => {
  it("requires a body", () => {
    expect(parseMessageForm({ body: "" }).success).toBe(false);
    expect(parseMessageForm({ body: "Sounds good" }).success).toBe(true);
  });

  it("enforces the message body limit", () => {
    expect(parseMessageForm({ body: "x".repeat(FIELD_LIMITS.messageBody + 1) }).success).toBe(false);
  });
});

describe("parseStatusUpdate", () => {
  it("accepts each valid status", () => {
    for (const status of ["open", "confirmed", "fulfilled", "declined"]) {
      expect(parseStatusUpdate({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(parseStatusUpdate({ status: "paid" }).success).toBe(false);
  });
});
