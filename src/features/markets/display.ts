import type { Market } from "@/lib/db";

/** Address + landmark, or the landmark alone when there's no street address. The Directions button stays address-only. */
export function marketAddressLine(market: Pick<Market, "address" | "landmark">): string | null {
  if (market.address) return market.landmark ? `${market.address}, ${market.landmark}` : market.address;
  return market.landmark || null;
}
