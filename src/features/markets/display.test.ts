import { describe, expect, it } from "vitest";
import { formatSchedule, hasValidHours } from "./display";

describe("formatSchedule", () => {
  it("joins digit ranges", () => {
    expect(formatSchedule("Fridays 10-6")).toBe("Fridays 10\u2060-\u20606");
    expect(formatSchedule("Fridays 10 - 6")).toBe("Fridays 10\u2060-\u20606");
  });
  it("leaves other text alone", () => {
    expect(formatSchedule("Sat-Sun")).toBe("Sat-Sun");
  });
});

describe("hasValidHours", () => {
  it("accepts close after open", () => {
    expect(hasValidHours({ dayOfWeek: 6, openMinutes: 480, closeMinutes: 840 })).toBe(true);
  });
  it("rejects missing parts and close <= open", () => {
    expect(hasValidHours({ dayOfWeek: null, openMinutes: 480, closeMinutes: 840 })).toBe(false);
    expect(hasValidHours({ dayOfWeek: 6, openMinutes: 480, closeMinutes: null })).toBe(false);
    expect(hasValidHours({ dayOfWeek: 6, openMinutes: 480, closeMinutes: 120 })).toBe(false);
    expect(hasValidHours({ dayOfWeek: 6, openMinutes: 480, closeMinutes: 480 })).toBe(false);
  });
});
