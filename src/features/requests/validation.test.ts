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
    contactPhone: "",
    ...overrides,
  };
}

function questionFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "question",
    notes: "Do you have salmon this week?",
    contactName: "Jamie",
    contactEmail: "",
    contactPhone: "",
    ...overrides,
  };
}

describe("parseRequestForm", () => {
  it("accepts a minimal fish request (no contact info required)", () => {
    const result = parseRequestForm(fishFields());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        requestType: "fish",
        species: "Halibut",
        quantity: "2 lbs",
        notes: null,
        contactName: "Jamie",
        contactEmail: null,
        contactPhone: null,
      });
    }
  });

  it("requires species for a fish request", () => {
    const result = parseRequestForm(fishFields({ species: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.species).toBeTruthy();
  });

  it("accepts a question request and nulls out species/quantity", () => {
    const result = parseRequestForm(questionFields({ species: "ignored", quantity: "ignored" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestType).toBe("question");
      expect(result.data.species).toBeNull();
      expect(result.data.quantity).toBeNull();
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
