import type { Market } from "@/lib/db";

/** Address + landmark, or the landmark alone when there's no street address. The Directions button stays address-only. */
export function marketAddressLine(market: Pick<Market, "address" | "landmark">): string | null {
  if (market.address) return market.landmark ? `${market.address}, ${market.landmark}` : market.address;
  return market.landmark || null;
}

/** Digit ranges ("10 - 6") → "10-6" with word-joiners so the range can't wrap at the hyphen. Other free text untouched. */
export function formatSchedule(schedule: string): string {
  return schedule.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1\u2060-\u2060$2");
}
