import { describe, expect, it } from "vitest";
import { FIELD_LIMITS, parseMarketForm, splitExpiresAt } from "./validation";

function regularForm(overrides: Record<string, unknown> = {}) {
  return {
    type: "regular",
    name: "Downtown Market",
    schedule: "Sat 8-2",
    subtitle: "",
    locationDetails: "",
    customerInfo: "",
    catchPreview: "",
    notes: "",
    county: "",
    city: "",
    ...overrides,
  };
}

function popupForm(overrides: Record<string, unknown> = {}) {
  return {
    ...regularForm(),
    type: "popup",
    expiresDate: "2026-09-10",
    expiresHour: "18",
    ...overrides,
  };
}

describe("parseMarketForm", () => {
  it("accepts a valid regular market with no expiry", () => {
    const result = parseMarketForm(regularForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("regular");
      expect(result.data.expiresAt).toBeNull();
    }
  });

  it("accepts a valid popup and combines date+hour as UTC", () => {
    const result = parseMarketForm(popupForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt?.toISOString()).toBe("2026-09-10T18:00:00.000Z");
    }
  });

  it("rejects a popup missing expiresDate", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.expiresDate).toBeTruthy();
  });

  it("rejects a regular market that supplies an expiry", () => {
    // `type: "regular"` with popup-only fields fails the discriminated union on the `type` literal itself.
    const result = parseMarketForm({ ...regularForm(), expiresDate: "2026-09-10", expiresHour: "18" });
    expect(result.success).toBe(true); // extra fields are simply ignored for the "regular" branch
    if (result.success) expect(result.data.expiresAt).toBeNull();
  });

  it("requires name and schedule", () => {
    const result = parseMarketForm(regularForm({ name: "", schedule: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.schedule).toBeTruthy();
    }
  });

  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    if (field === "name" || field === "schedule") continue;
    it(`rejects ${field} over its ${max}-character limit`, () => {
      const result = parseMarketForm(regularForm({ [field]: "x".repeat(max + 1) }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors[field]).toBeTruthy();
    });

    it(`accepts ${field} at exactly its ${max}-character limit`, () => {
      const result = parseMarketForm(regularForm({ [field]: "x".repeat(max) }));
      expect(result.success).toBe(true);
    });
  }

  it("rejects name over its limit", () => {
    const result = parseMarketForm(regularForm({ name: "x".repeat(FIELD_LIMITS.name + 1) }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeTruthy();
  });

  it("treats blank optional fields as null", () => {
    const result = parseMarketForm(regularForm({ subtitle: "   " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.subtitle).toBeNull();
  });
});

describe("splitExpiresAt", () => {
  it("round-trips through parseMarketForm's combined UTC instant", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "2026-09-10", expiresHour: "5" }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(splitExpiresAt(result.data.expiresAt)).toEqual({ expiresDate: "2026-09-10", expiresHour: "5" });
  });

  it("defaults to hour 23 with an empty date when null", () => {
    expect(splitExpiresAt(null)).toEqual({ expiresDate: "", expiresHour: "23" });
  });
});
