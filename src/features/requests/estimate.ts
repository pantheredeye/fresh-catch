import { formatCents } from "@/features/orders/components";
import { requestItemLine } from "./queries";

/**
 * Partial-pricing arithmetic and the plain-text estimate/quote bodies (#106).
 * Evan often can't price a line up front (market rate, unlisted, untagged
 * fish) — he aggregates orders, calls the coast, then quotes. Everything here
 * tolerates unknown prices; `Order.price` stays the order-level field of
 * record and is never derived here, only suggested.
 */
export type ResolvableItem = {
  species: string;
  quantity: string | null;
  notes: string | null;
  status: string;
  priceCents: number | null;
  marketRate: boolean;
  vendorNote: string | null;
};

/** True once Evan has touched the line — a status, a price, or a market-rate flag. */
export function isResolved(item: ResolvableItem): boolean {
  return item.status !== "requested" || item.priceCents != null || item.marketRate;
}

const STATUS_TEXT: Record<string, string> = {
  requested: "pending",
  available: "available",
  substituted: "substituted",
  unavailable: "unavailable",
};

/** "$24.00" / "market rate" / "price TBD" — null for unavailable lines, which carry no price. */
export function itemPriceText(item: ResolvableItem): string | null {
  if (item.status === "unavailable") return null;
  if (item.priceCents != null) return `${formatCents(item.priceCents)}${item.marketRate ? " (market rate)" : ""}`;
  return item.marketRate ? "market rate" : "price TBD";
}

/** One plain-text line of a resolution: "Halibut — 2 lbs: available · $24.00 (note)". */
export function resolutionLine(item: ResolvableItem): string {
  const status = STATUS_TEXT[item.status] ?? item.status;
  const price = itemPriceText(item);
  const note = item.vendorNote ? ` (${item.vendorNote})` : "";
  return `${requestItemLine(item)}: ${status}${price ? ` · ${price}` : ""}${note}`;
}

export type EstimateSummary = {
  /** Sum of the known per-item prices, unavailable lines excluded. */
  knownCents: number;
  pricedCount: number;
  /** Non-unavailable lines still without a price (market rate or TBD). */
  unpricedCount: number;
  unavailableCount: number;
};

export function summarizeEstimate(items: ResolvableItem[]): EstimateSummary {
  const summary: EstimateSummary = { knownCents: 0, pricedCount: 0, unpricedCount: 0, unavailableCount: 0 };
  for (const item of items) {
    if (item.status === "unavailable") {
      summary.unavailableCount += 1;
    } else if (item.priceCents != null) {
      summary.knownCents += item.priceCents;
      summary.pricedCount += 1;
    } else {
      summary.unpricedCount += 1;
    }
  }
  return summary;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function totalsLine(summary: EstimateSummary): string | null {
  if (summary.pricedCount > 0 && summary.unpricedCount > 0) {
    return `Estimated total so far: ${formatCents(summary.knownCents)} — ${plural(summary.unpricedCount, "item")} still to be priced.`;
  }
  if (summary.pricedCount > 0) return `Estimated total: ${formatCents(summary.knownCents)}.`;
  if (summary.unpricedCount > 0) return `Pricing to come on ${plural(summary.unpricedCount, "item")}.`;
  return null;
}

/** The vendor's pre-confirmation estimate message: one line per item, then the partial total. */
export function estimateMessageBody(items: ResolvableItem[]): string {
  const lines = items.map(resolutionLine).join("\n");
  const totals = totalsLine(summarizeEstimate(items));
  return `Here's where your order stands:\n${lines}${totals ? `\n\n${totals}` : ""}`;
}

/**
 * The confirm-time quote message (#65's "Quoted $X", extended by #106): the
 * order-level price is the field of record, and once any line is resolved the
 * message also lists the per-item resolution — unavailable lines included, so
 * the customer sees what dropped out of the quote.
 */
export function quoteMessageBody(order: { price: number; depositAmount: number | null }, items: ResolvableItem[]): string {
  const headline =
    `Quoted ${formatCents(order.price)} for this order.` +
    (order.depositAmount != null ? ` Deposit of ${formatCents(order.depositAmount)} requested.` : "");
  if (!items.some(isResolved)) return headline;
  return `${headline}\n\n${items.map(resolutionLine).join("\n")}`;
}

/**
 * Pre-fill for the confirm form's order-level price: the sum of known item
 * prices (unavailable excluded), with a helper flagging what's not counted.
 * Always editable — Evan's typed number wins.
 */
export function confirmPrefill(items: ResolvableItem[]): { priceDollars?: string; priceHelperText?: string } {
  const summary = summarizeEstimate(items);
  if (summary.pricedCount === 0) return {};
  return {
    priceDollars: (summary.knownCents / 100).toFixed(2),
    priceHelperText:
      summary.unpricedCount > 0
        ? `Pre-filled from ${plural(summary.pricedCount, "priced item")} — ${plural(summary.unpricedCount, "item")} not yet priced. Edit as needed.`
        : `Pre-filled from item prices. Edit as needed.`,
  };
}
