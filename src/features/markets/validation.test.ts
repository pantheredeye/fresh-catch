import { describe, expect, it } from "vitest";
import { FIELD_LIMITS, parseMarketForm as parse, splitExpiresAt, splitHours } from "./validation";

const TZ = "America/Chicago";
// Wed 2026-09-09 12:00 Chicago (CDT) = 17:00Z
const NOW = new Date("2026-09-09T17:00:00Z");
const opts = { tz: TZ, now: NOW };
const parseMarketForm = (raw: Record<string, unknown>, o: Parameters<typeof parse>[1] = opts) => parse(raw, o);

function regularForm(overrides: Record<string, unknown> = {}) {
  return {
    type: "regular",
    name: "Downtown Market",
    schedule: "Sat 8-2",
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
    expiresTime: "1080",
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

  it("accepts a valid popup and converts vendor-local date+time to UTC", () => {
    const result = parseMarketForm(popupForm());
    expect(result.success).toBe(true);
    if (result.success) {
      // Chicago 18:00 CDT = 23:00Z
      expect(result.data.expiresAt?.toISOString()).toBe("2026-09-10T23:00:00.000Z");
    }
  });

  it("rejects a popup missing expiresDate", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.expiresDate).toBeTruthy();
  });

  it("rejects a popup missing expiresTime", () => {
    const result = parseMarketForm(popupForm({ expiresTime: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.expiresTime).toBeTruthy();
  });

  it("rejects an impossible date", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "2026-02-31" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.expiresDate).toBeTruthy();
  });

  it("rejects an expiry in the past, keyed to expiresTime", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "2026-09-09", expiresTime: "660" })); // 11:00 local, now is 12:00
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.expiresTime).toMatch(/passed/);
  });

  it("allows an unchanged past expiry on edit", () => {
    const existing = new Date("2026-09-08T23:00:00Z");
    const result = parseMarketForm(popupForm({ expiresDate: "2026-09-08" }), { ...opts, existingExpiresAt: existing });
    expect(result.success).toBe(true);
  });

  it("still rejects a changed past expiry on edit", () => {
    const existing = new Date("2026-09-08T23:00:00Z");
    const result = parseMarketForm(popupForm({ expiresDate: "2026-09-07" }), { ...opts, existingExpiresAt: existing });
    expect(result.success).toBe(false);
  });

  it("saves a popup with partial hours — hours are ignored and nulled", () => {
    const result = parseMarketForm(popupForm({ dayOfWeek: "6" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayOfWeek).toBeNull();
      expect(result.data.openMinutes).toBeNull();
      expect(result.data.closeMinutes).toBeNull();
    }
  });

  it("ignores expiry fields on a regular market", () => {
    const result = parseMarketForm({ ...regularForm(), expiresDate: "2020-01-01", expiresTime: "0" });
    expect(result.success).toBe(true);
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

  it("treats blank optional fields as null and retires subtitle/locationDetails", () => {
    const result = parseMarketForm(regularForm({ notes: "   ", subtitle: "old", locationDetails: "old" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
      expect(result.data.subtitle).toBeNull();
      expect(result.data.locationDetails).toBeNull();
    }
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

  it("accepts a full set of hours as minutes-after-midnight", () => {
    const result = parseMarketForm(regularForm({ dayOfWeek: "6", openTime: "510", closeTime: "840" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayOfWeek).toBe(6);
      expect(result.data.openMinutes).toBe(510);
      expect(result.data.closeMinutes).toBe(840);
    }
  });

  it("keys the all-or-none error to the first blank field", () => {
    const dayOnly = parseMarketForm(regularForm({ dayOfWeek: "6" }));
    expect(dayOnly.success).toBe(false);
    if (!dayOnly.success) expect(Object.keys(dayOnly.errors)).toEqual(["openTime"]);

    const noDay = parseMarketForm(regularForm({ openTime: "480", closeTime: "840" }));
    expect(noDay.success).toBe(false);
    if (!noDay.success) expect(Object.keys(noDay.errors)).toEqual(["dayOfWeek"]);

    const noClose = parseMarketForm(regularForm({ dayOfWeek: "6", openTime: "480" }));
    expect(noClose.success).toBe(false);
    if (!noClose.success) expect(Object.keys(noClose.errors)).toEqual(["closeTime"]);
  });

  it("rejects a close time that isn't after the open time", () => {
    const result = parseMarketForm(regularForm({ dayOfWeek: "6", openTime: "840", closeTime: "480" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.closeTime).toBeTruthy();
  });
});

describe("free-text schedule am/pm check", () => {
  it("rejects close before open", () => {
    const result = parseMarketForm(regularForm({ schedule: "Sat 8-2am" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.schedule).toMatch(/earlier than opening/);
  });
  it("passes unsuffixed and well-formed ranges", () => {
    expect(parseMarketForm(regularForm({ schedule: "Sat 10-6" })).success).toBe(true);
    expect(parseMarketForm(regularForm({ schedule: "Sat 8am-2pm" })).success).toBe(true);
    // unsuffixed start reads as am when that makes sense: 10am-2pm, 11am-1pm
    expect(parseMarketForm(regularForm({ schedule: "Sat 10-2pm" })).success).toBe(true);
    expect(parseMarketForm(regularForm({ schedule: "Sat 11-1pm" })).success).toBe(true);
    expect(parseMarketForm(regularForm({ schedule: "Sat 8pm-2pm" })).success).toBe(false);
  });
});

describe("splitHours", () => {
  it("round-trips minutes", () => {
    expect(splitHours({ dayOfWeek: 3, openMinutes: 555, closeMinutes: 1065 })).toEqual({
      dayOfWeek: "3",
      openTime: "555",
      closeTime: "1065",
    });
  });

  it("returns all-blank fields when hours are unset", () => {
    expect(splitHours({ dayOfWeek: null, openMinutes: null, closeMinutes: null })).toEqual({
      dayOfWeek: "",
      openTime: "",
      closeTime: "",
    });
  });
});

describe("splitExpiresAt", () => {
  it("round-trips through parseMarketForm in the vendor timezone", () => {
    const result = parseMarketForm(popupForm({ expiresDate: "2026-09-10", expiresTime: "300" }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(splitExpiresAt(result.data.expiresAt, TZ, NOW)).toEqual({ expiresDate: "2026-09-10", expiresTime: "300" });
  });

  it("defaults a new popup to today 6:00 pm local", () => {
    expect(splitExpiresAt(null, TZ, NOW)).toEqual({ expiresDate: "2026-09-09", expiresTime: "1080" });
  });

  it("uses the local date, not UTC, for the default", () => {
    // 2026-09-10T02:00Z is still Sep 9 evening in Chicago
    expect(splitExpiresAt(null, TZ, new Date("2026-09-10T02:00:00Z")).expiresDate).toBe("2026-09-09");
  });
});
