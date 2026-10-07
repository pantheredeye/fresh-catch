import type { Market } from "@/lib/db";

/** Address + landmark, or the landmark alone when there's no street address. The Directions button stays address-only. */
export function marketAddressLine(market: Pick<Market, "address" | "landmark">): string | null {
  if (market.address) return market.landmark ? `${market.address}, ${market.landmark}` : market.address;
  return market.landmark || null;
}

/** True when a market has full structured hours with close after open. Bad legacy rows fall back to the free-text `schedule`. */
export function hasValidHours(
  m: Pick<Market, "dayOfWeek" | "openMinutes" | "closeMinutes">,
): m is { dayOfWeek: number; openMinutes: number; closeMinutes: number } & typeof m {
  return m.dayOfWeek !== null && m.openMinutes !== null && m.closeMinutes !== null && m.closeMinutes > m.openMinutes;
}

/** Digit ranges ("10 - 6") → "10-6" with word-joiners so the range can't wrap at the hyphen. Other free text untouched. */
export function formatSchedule(schedule: string): string {
  return schedule.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1\u2060-\u2060$2");
}
