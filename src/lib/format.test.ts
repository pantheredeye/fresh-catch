import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatFullDate,
  formatHoursRange,
  formatPhoneDisplay,
  formatPrice,
  formatRelativeHours,
  formatWeekOf,
  localParts,
  mapsHref,
  telHref,
  zonedTimeToUtc,
} from "./format";

describe("formatClockTime", () => {
  it("spells out whole hours without minutes", () => {
    expect(formatClockTime(10 * 60)).toBe("10am");
    expect(formatClockTime(18 * 60)).toBe("6pm");
  });

  it("keeps minutes when not on the hour", () => {
    expect(formatClockTime(8 * 60 + 30)).toBe("8:30am");
  });

  it("handles noon and midnight", () => {
    expect(formatClockTime(12 * 60)).toBe("12pm");
    expect(formatClockTime(0)).toBe("12am");
    expect(formatClockTime(12 * 60 + 30)).toBe("12:30pm");
    expect(formatClockTime(30)).toBe("12:30am");
  });
});

describe("formatHoursRange", () => {
  it("joins two spelled-out times, never a dash range", () => {
    expect(formatHoursRange(10 * 60, 18 * 60)).toBe("10am to 6pm");
    expect(formatHoursRange(10 * 60, 18 * 60)).not.toContain("-");
  });
});

describe("formatRelativeHours", () => {
  it("says 'within the hour' under 60 minutes", () => {
    expect(formatRelativeHours(45)).toBe("within the hour");
    expect(formatRelativeHours(59)).toBe("within the hour");
  });

  it("singularizes exactly one hour", () => {
    expect(formatRelativeHours(60)).toBe("in 1 hour");
    expect(formatRelativeHours(89)).toBe("in 1 hour");
  });

  it("rounds to the nearest hour for longer spans", () => {
    expect(formatRelativeHours(7 * 60)).toBe("in 7 hours");
    expect(formatRelativeHours(7 * 60 + 40)).toBe("in 8 hours");
  });
});

describe("formatWeekOf", () => {
  it("labels the Monday starting the week", () => {
    // Wednesday, September 9 2026 -> Monday September 7.
    expect(formatWeekOf(new Date("2026-09-09T18:00:00Z"), "America/Chicago")).toBe("Week of September 7");
  });

  it("maps a Monday to itself", () => {
    expect(formatWeekOf(new Date("2026-09-07T18:00:00Z"), "America/Chicago")).toBe("Week of September 7");
  });

  it("maps a Sunday to the prior Monday", () => {
    expect(formatWeekOf(new Date("2026-09-13T18:00:00Z"), "America/Chicago")).toBe("Week of September 7");
  });

  it("uses the local day at a TZ edge (Monday 00:30 UTC is still Sunday in Chicago)", () => {
    expect(formatWeekOf(new Date("2026-09-14T00:30:00Z"), "America/Chicago")).toBe("Week of September 7");
  });

  it("wraps across a month boundary", () => {
    // Saturday Aug 1 2026 -> Monday July 27.
    expect(formatWeekOf(new Date("2026-08-01T18:00:00Z"), "America/Chicago")).toBe("Week of July 27");
  });

  it("wraps across a year boundary", () => {
    // Friday Jan 1 2027 -> Monday Dec 28 2026.
    expect(formatWeekOf(new Date("2027-01-01T18:00:00Z"), "America/Chicago")).toBe("Week of December 28");
  });
});

describe("formatPrice", () => {
  it("drops cents when whole dollars", () => {
    expect(formatPrice(1400)).toBe("$14");
  });

  it("keeps cents otherwise", () => {
    expect(formatPrice(1450)).toBe("$14.50");
  });
});

describe("telHref", () => {
  it("normalizes a 10-digit US number with country code", () => {
    expect(telHref("(505) 555-0142")).toBe("tel:+15055550142");
  });

  it("passes through an already-11-digit number", () => {
    expect(telHref("1-505-555-0142")).toBe("tel:+15055550142");
  });
});

describe("formatPhoneDisplay", () => {
  it("formats a stored E.164 number for display", () => {
    expect(formatPhoneDisplay("+16625551234")).toBe("(662) 555-1234");
  });

  it("falls back to the raw input when it isn't a 10-digit US number", () => {
    expect(formatPhoneDisplay("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});

describe("formatFullDate", () => {
  it("spells out the weekday and month", () => {
    // Friday September 11 2026, checked at noon Central.
    expect(formatFullDate(new Date("2026-09-11T17:00:00Z"), "America/Chicago")).toBe("Friday, September 11");
  });
});

describe("mapsHref", () => {
  it("builds a maps search link from a free-text address", () => {
    expect(mapsHref("4400 Adobe Ranch Road")).toBe("https://maps.google.com/?q=4400%20Adobe%20Ranch%20Road");
  });
});

describe("localParts + zonedTimeToUtc timezone math", () => {
  it("round-trips a wall-clock time in Central Standard Time (winter, UTC-6)", () => {
    const instant = zonedTimeToUtc(2026, 1, 15, 10, 0, "America/Chicago");
    expect(instant.toISOString()).toBe("2026-01-15T16:00:00.000Z");
  });

  it("round-trips a wall-clock time in Central Daylight Time (summer, UTC-5)", () => {
    const instant = zonedTimeToUtc(2026, 7, 15, 10, 0, "America/Chicago");
    expect(instant.toISOString()).toBe("2026-07-15T15:00:00.000Z");
  });

  it("uses the post-transition offset for a time on the spring-forward day", () => {
    // 2026-03-08 is the US spring-forward date; 10am local is after the 2am transition, so CDT (UTC-5) applies.
    const instant = zonedTimeToUtc(2026, 3, 8, 10, 0, "America/Chicago");
    expect(instant.toISOString()).toBe("2026-03-08T15:00:00.000Z");
  });

  it("reads the correct local weekday across a UTC date boundary", () => {
    // 2026-09-10T02:00:00Z is still Wednesday evening (9pm) in Chicago.
    const parts = localParts(new Date("2026-09-10T02:00:00Z"), "America/Chicago");
    expect(parts.weekday).toBe(3); // Wednesday
    expect(parts.hour).toBe(21);
  });
});
