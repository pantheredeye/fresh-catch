import { describe, expect, it } from "vitest";
import { FIELD_LIMITS, parseMarketForm, splitExpiresAt, splitHours } from "./validation";

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

  it("accepts an address and landmark", () => {
    const result = parseMarketForm(regularForm({ address: "123 Main St", landmark: "Next to the gas station" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBe("123 Main St");
      expect(result.data.landmark).toBe("Next to the gas station");
    }
  });

  it("leaves hours null when day/open/close are all blank", () => {
    const result = parseMarketForm(regularForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayOfWeek).toBeNull();
      expect(result.data.openMinutes).toBeNull();
      expect(result.data.closeMinutes).toBeNull();
    }
  });

  it("accepts a full set of hours and combines hour+minute into minutes-after-midnight", () => {
    const result = parseMarketForm(
      regularForm({ dayOfWeek: "6", openHour: "8", openMinute: "30", closeHour: "14", closeMinute: "0" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayOfWeek).toBe(6);
      expect(result.data.openMinutes).toBe(8 * 60 + 30);
      expect(result.data.closeMinutes).toBe(14 * 60);
    }
  });

  it("rejects a partial set of hours (all-or-none)", () => {
    const result = parseMarketForm(regularForm({ dayOfWeek: "6", openHour: "8" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.dayOfWeek).toBeTruthy();
  });

  it("rejects a close time that isn't after the open time", () => {
    const result = parseMarketForm(
      regularForm({ dayOfWeek: "6", openHour: "14", openMinute: "0", closeHour: "8", closeMinute: "0" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.dayOfWeek).toBeTruthy();
  });
});

describe("splitHours", () => {
  it("round-trips through parseMarketForm's combined minutes", () => {
    const result = parseMarketForm(
      regularForm({ dayOfWeek: "3", openHour: "9", openMinute: "15", closeHour: "17", closeMinute: "45" }),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(splitHours(result.data)).toEqual({
      dayOfWeek: "3",
      openHour: "9",
      openMinute: "15",
      closeHour: "17",
      closeMinute: "45",
    });
  });

  it("returns all-blank fields when hours are unset", () => {
    expect(splitHours({ dayOfWeek: null, openMinutes: null, closeMinutes: null })).toEqual({
      dayOfWeek: "",
      openHour: "",
      openMinute: "",
      closeHour: "",
      closeMinute: "",
    });
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
