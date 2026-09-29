import { describe, expect, it } from "vitest";
import {
  describeOccurrence,
  describeTodayStatus,
  nextDifferentMarketByDay,
  nextOccurrence,
  resolveToday,
  type StatusMarket,
} from "./status";

const TZ = "America/Chicago";

function regular(overrides: Partial<StatusMarket> = {}): StatusMarket {
  return {
    id: `market-${Math.random()}`,
    name: "Test Market",
    type: "regular",
    active: true,
    cancelledAt: null,
    dayOfWeek: 3, // Wednesday
    openMinutes: 10 * 60, // 10am
    closeMinutes: 18 * 60, // 6pm
    expiresAt: null,
    ...overrides,
  };
}

function popup(overrides: Partial<StatusMarket> = {}): StatusMarket {
  return {
    id: `popup-${Math.random()}`,
    name: "Test Popup",
    type: "popup",
    active: true,
    cancelledAt: null,
    dayOfWeek: null,
    openMinutes: null,
    closeMinutes: null,
    expiresAt: new Date("2026-09-12T00:00:00Z"),
    ...overrides,
  };
}

// Wednesday 2026-09-09 is dayOfWeek 3, matching `regular()`'s default schedule.
const WEDNESDAY_BEFORE_OPEN = new Date("2026-09-09T14:00:00Z"); // 9am CDT
const WEDNESDAY_OPEN = new Date("2026-09-09T17:00:00Z"); // 12pm CDT
const WEDNESDAY_AFTER_CLOSE = new Date("2026-09-09T23:30:00Z"); // 6:30pm CDT
const THURSDAY = new Date("2026-09-10T17:00:00Z"); // no market scheduled

describe("resolveToday — table-driven states", () => {
  it("open: now falls within a market's hours", () => {
    const market = regular();
    const status = resolveToday([market], WEDNESDAY_OPEN, TZ);
    expect(status).toEqual({ kind: "open", market, next: null, after: false });
  });

  it("opens-later: now is before a market's open time on its day", () => {
    const market = regular();
    const status = resolveToday([market], WEDNESDAY_BEFORE_OPEN, TZ);
    expect(status).toEqual({ kind: "opens-later", market, next: null, after: false });
  });

  it("closed-today: no market scheduled for today at all", () => {
    const market = regular();
    const status = resolveToday([market], THURSDAY, TZ);
    expect(status.kind).toBe("closed-today");
    expect(status.market).toBeNull();
    expect(status.after).toBe(false);
    expect(status.next?.market).toBe(market);
  });

  it("closed-today (after close): today was a market day but hours have passed, rolls forward", () => {
    const today = regular({ id: "today" });
    const friday = regular({ id: "friday", dayOfWeek: 5, openMinutes: 10 * 60, closeMinutes: 18 * 60 });
    const status = resolveToday([today, friday], WEDNESDAY_AFTER_CLOSE, TZ);
    expect(status.kind).toBe("closed-today");
    expect(status.market).toBeNull();
    expect(status.after).toBe(true);
    expect(status.next?.market).toBe(friday);
  });
});

describe("resolveToday — multiple markets same day", () => {
  it("prefers the soonest-closing market when more than one is open now", () => {
    const soonToClose = regular({ id: "soon", openMinutes: 10 * 60, closeMinutes: 13 * 60 });
    const laterClose = regular({ id: "later", openMinutes: 9 * 60, closeMinutes: 20 * 60 });
    const status = resolveToday([laterClose, soonToClose], WEDNESDAY_OPEN, TZ);
    expect(status.kind).toBe("open");
    expect(status.market?.id).toBe("soon");
  });

  it("prefers the soonest-opening market when none are open yet but more than one opens later today", () => {
    const opensAtNoon = regular({ id: "noon", openMinutes: 12 * 60, closeMinutes: 18 * 60 });
    const opensAt2 = regular({ id: "two", openMinutes: 14 * 60, closeMinutes: 20 * 60 });
    const status = resolveToday([opensAt2, opensAtNoon], WEDNESDAY_BEFORE_OPEN, TZ);
    expect(status.kind).toBe("opens-later");
    expect(status.market?.id).toBe("noon");
  });

  it("rolls to a different market opening later today instead of reporting closed, when one market's slot already passed", () => {
    const alreadyClosed = regular({ id: "morning", openMinutes: 6 * 60, closeMinutes: 8 * 60 });
    const opensLater = regular({ id: "afternoon", openMinutes: 14 * 60, closeMinutes: 20 * 60 });
    const status = resolveToday([alreadyClosed, opensLater], WEDNESDAY_OPEN, TZ);
    expect(status.kind).toBe("opens-later");
    expect(status.market?.id).toBe("afternoon");
  });
});

describe("resolveToday — zero structured markets", () => {
  it("returns closed-today with no next when nothing has structured hours", () => {
    const scheduleOnly: StatusMarket = regular({ dayOfWeek: null, openMinutes: null, closeMinutes: null });
    const status = resolveToday([scheduleOnly], WEDNESDAY_OPEN, TZ);
    expect(status).toEqual({ kind: "closed-today", market: null, next: null, after: false });
  });

  it("returns closed-today with no next for an empty market list", () => {
    expect(resolveToday([], WEDNESDAY_OPEN, TZ)).toEqual({ kind: "closed-today", market: null, next: null, after: false });
  });

  it("ignores inactive regular markets", () => {
    const inactive = regular({ active: false });
    const status = resolveToday([inactive], WEDNESDAY_OPEN, TZ);
    expect(status.kind).toBe("closed-today");
  });
});

describe("resolveToday — popups", () => {
  it("a live popup wins the hero over a regular market open the same day (epic #69 Q9)", () => {
    const live = popup({ expiresAt: new Date(WEDNESDAY_OPEN.getTime() + 3 * 60 * 60 * 1000) });
    const market = regular();
    const status = resolveToday([market, live], WEDNESDAY_OPEN, TZ);
    expect(status).toEqual({ kind: "open", market: live, next: null, after: false });
  });

  it("an expired popup does not participate; falls through to the regular market", () => {
    const expired = popup({ expiresAt: new Date(WEDNESDAY_OPEN.getTime() - 1000) });
    const market = regular();
    const status = resolveToday([market, expired], WEDNESDAY_OPEN, TZ);
    expect(status.kind).toBe("open");
    expect(status.market).toBe(market);
  });

  it("a cancelled popup does not participate", () => {
    const cancelled = popup({ cancelledAt: new Date("2026-09-01T00:00:00Z") });
    const status = resolveToday([cancelled], WEDNESDAY_OPEN, TZ);
    expect(status.kind).toBe("closed-today");
  });

  it("picks the soonest-expiring popup when more than one is live", () => {
    const expiresSoon = popup({ id: "soon", expiresAt: new Date(WEDNESDAY_OPEN.getTime() + 60 * 60 * 1000) });
    const expiresLater = popup({ id: "later", expiresAt: new Date(WEDNESDAY_OPEN.getTime() + 5 * 60 * 60 * 1000) });
    const status = resolveToday([expiresLater, expiresSoon], WEDNESDAY_OPEN, TZ);
    expect(status.market?.id).toBe("soon");
  });
});

describe("resolveToday — week wrap (Sat -> Sun)", () => {
  it("rolls a Saturday market forward to Sunday, not backward within the same week", () => {
    // Saturday 2026-09-12 18:00 UTC = 1pm CDT, after a market that runs 10-noon Saturday.
    const saturdayMarket = regular({ id: "sat", dayOfWeek: 6, openMinutes: 10 * 60, closeMinutes: 12 * 60 });
    const sundayMarket = regular({ id: "sun", dayOfWeek: 0, openMinutes: 9 * 60, closeMinutes: 14 * 60 });
    const saturdayAfternoon = new Date("2026-09-12T18:00:00Z");
    const status = resolveToday([saturdayMarket, sundayMarket], saturdayAfternoon, TZ);
    expect(status.kind).toBe("closed-today");
    expect(status.after).toBe(true);
    expect(status.next?.market.id).toBe("sun");
    expect(status.next?.opensAt.toISOString()).toBe("2026-09-13T14:00:00.000Z"); // Sunday 9am CDT
  });

  it("rolls a Saturday-only market's next occurrence into the following week", () => {
    const saturdayMarket = regular({ dayOfWeek: 6, openMinutes: 10 * 60, closeMinutes: 12 * 60 });
    const saturdayAfternoon = new Date("2026-09-12T18:00:00Z");
    const occurrence = nextOccurrence(saturdayMarket, saturdayAfternoon, TZ);
    expect(occurrence?.opensAt.toISOString()).toBe("2026-09-19T15:00:00.000Z"); // next Saturday 10am CDT
  });
});

describe("resolveToday / nextOccurrence — DST boundary", () => {
  it("computes the correct UTC instant for an occurrence that falls after the spring-forward transition", () => {
    // 2026-03-08 is spring-forward day; evaluate from the Sunday before (2026-03-01).
    const market = regular({ dayOfWeek: 0, openMinutes: 10 * 60, closeMinutes: 18 * 60 });
    const beforeTransitionWeek = new Date("2026-03-02T12:00:00Z"); // Monday, still CST
    const occurrence = nextOccurrence(market, beforeTransitionWeek, TZ);
    // Next Sunday (2026-03-08) 10am is after the 2am transition, so CDT (UTC-5) applies.
    expect(occurrence?.opensAt.toISOString()).toBe("2026-03-08T15:00:00.000Z");
  });
});

describe("nextOccurrence", () => {
  it("reports open-now with the correct close instant", () => {
    const market = regular();
    const occurrence = nextOccurrence(market, WEDNESDAY_OPEN, TZ);
    expect(occurrence).toEqual({
      market,
      state: "open-now",
      opensAt: new Date("2026-09-09T15:00:00.000Z"),
      closesAt: new Date("2026-09-09T23:00:00.000Z"),
    });
  });

  it("reports upcoming for a live popup as open-now with expiresAt as the close boundary", () => {
    const live = popup({ expiresAt: new Date("2026-09-12T00:00:00Z") });
    const occurrence = nextOccurrence(live, WEDNESDAY_OPEN, TZ);
    expect(occurrence).toEqual({ market: live, state: "open-now", opensAt: WEDNESDAY_OPEN, closesAt: live.expiresAt });
  });

  it("returns null for an expired popup", () => {
    const expired = popup({ expiresAt: new Date(WEDNESDAY_OPEN.getTime() - 1000) });
    expect(nextOccurrence(expired, WEDNESDAY_OPEN, TZ)).toBeNull();
  });

  it("returns null for a regular market missing structured hours", () => {
    const scheduleOnly = regular({ dayOfWeek: null, openMinutes: null, closeMinutes: null });
    expect(nextOccurrence(scheduleOnly, WEDNESDAY_OPEN, TZ)).toBeNull();
  });
});

describe("describeTodayStatus", () => {
  it("open: closes in N hours", () => {
    const status = resolveToday([regular()], WEDNESDAY_OPEN, TZ);
    expect(describeTodayStatus(status, WEDNESDAY_OPEN, TZ)).toBe("Closes in 6 hours.");
  });

  it("open: closes within the hour", () => {
    const market = regular({ closeMinutes: 12 * 60 + 20 }); // closes 12:20pm
    const almostClosed = new Date("2026-09-09T17:00:00Z"); // noon CDT
    const status = resolveToday([market], almostClosed, TZ);
    expect(describeTodayStatus(status, almostClosed, TZ)).toBe("Closes within the hour.");
  });

  it("opens-later: opens in N hours", () => {
    const status = resolveToday([regular()], WEDNESDAY_BEFORE_OPEN, TZ);
    expect(describeTodayStatus(status, WEDNESDAY_BEFORE_OPEN, TZ)).toBe("Opens in 1 hour.");
  });

  it("closed-today: back on <weekday>", () => {
    const status = resolveToday([regular()], THURSDAY, TZ);
    expect(describeTodayStatus(status, THURSDAY, TZ)).toBe("Back on Wednesday.");
  });

  it("closed-today with no configured markets: falls back to Closed.", () => {
    const status = resolveToday([], WEDNESDAY_OPEN, TZ);
    expect(describeTodayStatus(status, WEDNESDAY_OPEN, TZ)).toBe("Closed.");
  });
});

describe("describeOccurrence (saved band)", () => {
  it("open today until <time>", () => {
    const occurrence = nextOccurrence(regular(), WEDNESDAY_OPEN, TZ)!;
    expect(describeOccurrence(occurrence, WEDNESDAY_OPEN, TZ)).toBe("Open today until 6pm");
  });

  it("opens today at <time>", () => {
    const occurrence = nextOccurrence(regular(), WEDNESDAY_BEFORE_OPEN, TZ)!;
    expect(describeOccurrence(occurrence, WEDNESDAY_BEFORE_OPEN, TZ)).toBe("Opens today at 10am");
  });

  it("next <weekday>, <hours range> for a future day", () => {
    const occurrence = nextOccurrence(regular(), THURSDAY, TZ)!;
    expect(describeOccurrence(occurrence, THURSDAY, TZ)).toBe("Next Wednesday, 10am to 6pm");
  });

  it("open until <weekday>, <time> for a live popup expiring on a later day", () => {
    const live = popup({ expiresAt: new Date("2026-09-12T23:00:00Z") }); // Saturday 6pm CDT
    const occurrence = nextOccurrence(live, WEDNESDAY_OPEN, TZ)!;
    expect(describeOccurrence(occurrence, WEDNESDAY_OPEN, TZ)).toBe("Open until Saturday, 6pm");
  });
});

describe("nextDifferentMarketByDay (hero 'Then Saturday, …' line)", () => {
  it("finds the next market on a later day, skipping the excluded one", () => {
    const wednesday = regular({ id: "wed", dayOfWeek: 3 });
    const saturday = regular({ id: "sat", name: "Cottonwood Plaza", dayOfWeek: 6 });
    const result = nextDifferentMarketByDay([wednesday, saturday], "wed", WEDNESDAY_OPEN, TZ);
    expect(result).toEqual({ weekday: 6, market: saturday });
  });

  it("wraps the week to find a market before the excluded one's day", () => {
    const saturday = regular({ id: "sat", dayOfWeek: 6 });
    const wednesday = regular({ id: "wed", name: "Mesa View", dayOfWeek: 3 });
    const result = nextDifferentMarketByDay([saturday, wednesday], "sat", WEDNESDAY_OPEN, TZ);
    expect(result).toEqual({ weekday: 3, market: wednesday });
  });

  it("returns null when no other regular market exists", () => {
    const only = regular({ id: "only" });
    expect(nextDifferentMarketByDay([only], "only", WEDNESDAY_OPEN, TZ)).toBeNull();
  });

  it("ignores popups and inactive markets as candidates", () => {
    const live = popup({ dayOfWeek: null });
    const inactive = regular({ id: "inactive", dayOfWeek: 6, active: false });
    const result = nextDifferentMarketByDay([live, inactive], null, WEDNESDAY_OPEN, TZ);
    expect(result).toBeNull();
  });
});
