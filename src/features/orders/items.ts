import type { FishRequest, RequestItem } from "@/lib/db";

/**
 * `Order.items` snapshot (issue 105): the request's items frozen at confirm time,
 * including each item's vendor resolution so far. `priceCents` stays null for
 * market-rate/unlisted/untagged fish until Evan quotes an estimate — order
 * rendering must tolerate partial/unknown pricing (epic 101).
 */
export type OrderItemSnapshot = {
  species: string;
  quantity: string | null;
  notes: string | null;
  isCustom: boolean;
  status: string;
  priceCents: number | null;
  marketRate: boolean;
  vendorNote: string | null;
};

export type OrderItems = { version: 2; items: OrderItemSnapshot[]; orderNotes: string | null };

export function snapshotOrderItems(request: FishRequest, items: RequestItem[]): string {
  return JSON.stringify({
    version: 2,
    items: items.map((item) => ({
      species: item.species,
      quantity: item.quantity,
      notes: item.notes,
      isCustom: item.isCustom,
      status: item.status,
      priceCents: item.priceCents,
      marketRate: item.marketRate,
      vendorNote: item.vendorNote,
    })),
    orderNotes: request.notes,
  } satisfies OrderItems);
}

function snapshotItem(raw: Record<string, unknown>): OrderItemSnapshot {
  return {
    species: raw.species as string,
    quantity: typeof raw.quantity === "string" ? raw.quantity : null,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    isCustom: raw.isCustom === true,
    status: typeof raw.status === "string" ? raw.status : "requested",
    priceCents: typeof raw.priceCents === "number" ? raw.priceCents : null,
    marketRate: raw.marketRate === true,
    vendorNote: typeof raw.vendorNote === "string" ? raw.vendorNote : null,
  };
}

/**
 * Reads any `Order.items` ever written, normalized to the v2 shape. v1
 * (pre-105) was `{ requestType, species, quantity, notes }` — one implicit
 * item plus order-level notes. Unparseable/unknown payloads come back null;
 * callers render the order without an item list rather than erroring.
 */
export function parseOrderItems(json: string): OrderItems | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  if (record.version === 2 && Array.isArray(record.items)) {
    const items = record.items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && typeof (item as Record<string, unknown>).species === "string")
      .map(snapshotItem);
    return { version: 2, items, orderNotes: typeof record.orderNotes === "string" ? record.orderNotes : null };
  }
  if ("version" in record) return null;

  const species = typeof record.species === "string" ? record.species : null;
  return {
    version: 2,
    items: species ? [snapshotItem({ species, quantity: record.quantity })] : [],
    orderNotes: typeof record.notes === "string" ? record.notes : null,
  };
}
