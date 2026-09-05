import { db } from "@/lib/db";
import type { Market } from "@/lib/db";
import type { MarketInput } from "./validation";

/** Regular markets shown on the admin dashboard and (later) customer nav. */
export function listActiveMarkets(): Promise<Market[]> {
  return db.market.findMany({
    where: { type: "regular", active: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Popup status is derived, never stored (C4) — live means not cancelled and
 * not yet expired. No cron, no status column to drift.
 */
export function listLivePopups(): Promise<Market[]> {
  const now = new Date();
  return db.market.findMany({
    where: {
      type: "popup",
      active: true,
      cancelledAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { expiresAt: "asc" },
  });
}

/** Powers the public `/markets/past` archive — cancelled or expired popups. */
export function listPastPopups(limit = 50): Promise<Market[]> {
  const now = new Date();
  return db.market.findMany({
    where: {
      type: "popup",
      OR: [{ cancelledAt: { not: null } }, { expiresAt: { lte: now } }],
    },
    orderBy: { expiresAt: "desc" },
    take: limit,
  });
}

export function getMarket(id: string): Promise<Market | null> {
  return db.market.findUnique({ where: { id } });
}

export function createMarket(data: MarketInput): Promise<Market> {
  return db.market.create({ data });
}

export function updateMarket(id: string, data: MarketInput): Promise<Market> {
  return db.market.update({ where: { id }, data });
}

/** Soft deactivate only (C6): popups get `cancelledAt`, regular markets toggle `active`. */
export async function cancelMarket(id: string): Promise<Market | null> {
  const market = await db.market.findUnique({ where: { id } });
  if (!market) return null;
  if (market.type === "popup") {
    return db.market.update({ where: { id }, data: { cancelledAt: new Date() } });
  }
  return db.market.update({ where: { id }, data: { active: false } });
}
