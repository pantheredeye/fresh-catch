/**
 * Market open/closed status, per handoff §4 Behavior. Pure — no DB, no
 * clock reads; callers pass `now` and `Vendor.timezone` explicitly so this
 * stays testable and reads correctly with JS off (server-rendered per
 * request).
 */
import type { Market } from "@/lib/db";
import { WEEKDAY_NAMES, formatClockTime, formatHoursRange, formatRelativeHours, localParts, zonedTimeToUtc } from "@/lib/format";

export type StatusMarket = Pick<Market, "id" | "name" | "type" | "active" | "cancelledAt" | "dayOfWeek" | "openMinutes" | "closeMinutes" | "expiresAt">;

type StructuredMarket = StatusMarket & { dayOfWeek: number; openMinutes: number; closeMinutes: number };
type LivePopup = StatusMarket & { expiresAt: Date };

export type Occurrence = {
  market: StatusMarket;
  state: "open-now" | "upcoming";
  opensAt: Date;
  closesAt: Date;
};

export type TodayStatus = {
  kind: "open" | "opens-later" | "closed-today";
  market: StatusMarket | null;
  next: Occurrence | null;
  after: boolean;
};

function hasStructuredHours(market: StatusMarket): market is StructuredMarket {
  return market.dayOfWeek !== null && market.openMinutes !== null && market.closeMinutes !== null;
}

function isLivePopup(market: StatusMarket, now: Date): market is LivePopup {
  return market.type === "popup" && market.cancelledAt === null && market.expiresAt !== null && market.expiresAt > now;
}

export function isSameLocalDate(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function buildOccurrence(market: StructuredMarket, local: { year: number; month: number; day: number }, daysAhead: number, tz: string) {
  const anchor = new Date(Date.UTC(local.year, local.month - 1, local.day));
  anchor.setUTCDate(anchor.getUTCDate() + daysAhead);
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth() + 1;
  const d = anchor.getUTCDate();
  return {
    opensAt: zonedTimeToUtc(y, m, d, Math.floor(market.openMinutes / 60), market.openMinutes % 60, tz),
    closesAt: zonedTimeToUtc(y, m, d, Math.floor(market.closeMinutes / 60), market.closeMinutes % 60, tz),
  };
}

/**
 * Where a market's weekly slot falls relative to `now`. Popups don't
 * recur — a live popup is "open-now" from the moment it's created until
 * `expiresAt` (its only clock), the one state a popup ever returns.
 * Expired/cancelled popups and regular markets missing structured hours
 * return `null` — nothing to occur next.
 */
export function nextOccurrence(market: StatusMarket, now: Date, tz: string): Occurrence | null {
  if (market.type === "popup") {
    if (!isLivePopup(market, now)) return null;
    return { market, state: "open-now", opensAt: now, closesAt: market.expiresAt };
  }
  if (!hasStructuredHours(market)) return null;

  const local = localParts(now, tz);
  const deltaDays = (market.dayOfWeek - local.weekday + 7) % 7;
  let occurrence = buildOccurrence(market, local, deltaDays, tz);
  if (deltaDays === 0 && now > occurrence.closesAt) {
    occurrence = buildOccurrence(market, local, 7, tz);
  }
  const state = now >= occurrence.opensAt && now <= occurrence.closesAt ? "open-now" : "upcoming";
  return { market, state, opensAt: occurrence.opensAt, closesAt: occurrence.closesAt };
}

/**
 * Today's market status. Resolves four states from handoff §4: open now;
 * opens later today; closed today (no market scheduled); after close on a
 * market day (folded into "closed-today" via `after: true`) — both closed
 * variants roll `next` forward to the soonest upcoming stop. Only markets
 * with all three structured hour fields set participate; `schedule`-only
 * markets don't have enough to compute a state and are silently skipped.
 *
 * A live popup always wins the hero over a regular market on the same day
 * (epic #69 Q9, locked): while one is live it's the only thing this ever
 * reports as "open", regardless of any regular market's hours.
 */
export function resolveToday(markets: StatusMarket[], now: Date, tz: string): TodayStatus {
  const livePopups = markets.filter((m): m is LivePopup => isLivePopup(m, now));
  if (livePopups.length > 0) {
    const popup = livePopups.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())[0];
    return { kind: "open", market: popup, next: null, after: false };
  }

  const regulars = markets.filter((m): m is StructuredMarket => m.type === "regular" && m.active && hasStructuredHours(m));
  const occurrences = regulars
    .map((market) => nextOccurrence(market, now, tz))
    .filter((occ): occ is Occurrence => occ !== null);

  const openNow = occurrences.filter((occ) => occ.state === "open-now");
  if (openNow.length > 0) {
    const winner = openNow.sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())[0];
    return { kind: "open", market: winner.market, next: null, after: false };
  }

  const local = localParts(now, tz);
  const upcomingToday = occurrences.filter((occ) => occ.state === "upcoming" && isSameLocalDate(localParts(occ.opensAt, tz), local));
  if (upcomingToday.length > 0) {
    const winner = upcomingToday.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0];
    return { kind: "opens-later", market: winner.market, next: null, after: false };
  }

  const after = regulars.some((m) => m.dayOfWeek === local.weekday);
  const next = occurrences.length > 0 ? occurrences.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0] : null;
  return { kind: "closed-today", market: null, next, after };
}

/** "Closes in 7 hours." / "Closes within the hour." / "Opens in 4 hours." / "Back on Wednesday." */
export function describeTodayStatus(status: TodayStatus, now: Date, tz: string): string {
  if (status.kind === "open" && status.market) {
    const occurrence = nextOccurrence(status.market, now, tz);
    const minutesLeft = occurrence ? Math.round((occurrence.closesAt.getTime() - now.getTime()) / 60_000) : 0;
    return `Closes ${formatRelativeHours(minutesLeft)}.`;
  }
  if (status.kind === "opens-later" && status.market) {
    const occurrence = nextOccurrence(status.market, now, tz);
    const minutesUntil = occurrence ? Math.round((occurrence.opensAt.getTime() - now.getTime()) / 60_000) : 0;
    return `Opens ${formatRelativeHours(minutesUntil)}.`;
  }
  if (status.next) {
    return `Back on ${WEEKDAY_NAMES[localParts(status.next.opensAt, tz).weekday]}.`;
  }
  return "Closed.";
}

/**
 * The next *different* market on the weekly route after today, for the
 * hero's "Then Saturday, …" line (handoff §5). Walks day-of-week forward
 * from tomorrow, skipping `excludeMarketId` (whichever market the hero is
 * already showing) — popups don't recur so they're not candidates here.
 */
export function nextDifferentMarketByDay(
  markets: StatusMarket[],
  excludeMarketId: string | null,
  now: Date,
  tz: string,
): { weekday: number; market: StatusMarket } | null {
  const regulars = markets.filter(
    (m) => m.type === "regular" && m.active && m.dayOfWeek !== null && m.id !== excludeMarketId,
  );
  const todayWeekday = localParts(now, tz).weekday;
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const weekday = (todayWeekday + daysAhead) % 7;
    const market = regulars.find((m) => m.dayOfWeek === weekday);
    if (market) return { weekday, market };
  }
  return null;
}

/**
 * For the saved-markets band: "Open today until 6pm" / "Opens today at
 * 3pm" / "Next Wednesday, 3pm to 7pm". A live popup's `closesAt` is its
 * `expiresAt`, which may land on a later calendar day than `now` (a
 * multi-day popup) — that case reads "Open until Saturday, 6pm" instead of
 * claiming "today".
 */
export function describeOccurrence(occurrence: Occurrence, now: Date, tz: string): string {
  const nowLocal = localParts(now, tz);
  const closesLocal = localParts(occurrence.closesAt, tz);
  const closesMinutes = closesLocal.hour * 60 + closesLocal.minute;

  if (occurrence.state === "open-now") {
    return isSameLocalDate(closesLocal, nowLocal)
      ? `Open today until ${formatClockTime(closesMinutes)}`
      : `Open until ${WEEKDAY_NAMES[closesLocal.weekday]}, ${formatClockTime(closesMinutes)}`;
  }

  const opensLocal = localParts(occurrence.opensAt, tz);
  const opensMinutes = opensLocal.hour * 60 + opensLocal.minute;
  if (isSameLocalDate(opensLocal, nowLocal)) {
    return `Opens today at ${formatClockTime(opensMinutes)}`;
  }
  return `Next ${WEEKDAY_NAMES[opensLocal.weekday]}, ${formatHoursRange(opensMinutes, closesMinutes)}`;
}
