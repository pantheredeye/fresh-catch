import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import {
  cancelMarket,
  createMarket,
  deriveMarketStatus,
  getMarket,
  listActiveMarkets,
  listLivePopups,
  listPastPopups,
  updateMarket,
} from "./queries";
import type { MarketInput } from "./validation";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

function marketInput(overrides: Partial<MarketInput> = {}): MarketInput {
  return {
    type: "regular",
    name: `Market ${crypto.randomUUID()}`,
    schedule: "Sat 8-2",
    subtitle: null,
    locationDetails: null,
    customerInfo: null,
    catchPreview: null,
    notes: null,
    county: null,
    city: null,
    expiresAt: null,
    ...overrides,
  };
}

describe("listActiveMarkets", () => {
  it("returns active regular markets, excludes inactive and popups", async () => {
    const active = await createMarket(marketInput({ name: `Active ${crypto.randomUUID()}` }));
    const inactive = await createMarket(marketInput({ name: `Inactive ${crypto.randomUUID()}` }));
    await db.market.update({ where: { id: inactive.id }, data: { active: false } });
    const popup = await createMarket(
      marketInput({ type: "popup", name: `Popup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) }),
    );

    const result = await listActiveMarkets();
    const ids = result.map((m) => m.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
    expect(ids).not.toContain(popup.id);
  });
});

describe("popup live/past derivation (C4)", () => {
  it("treats an expired-by-a-second popup as past, not live", async () => {
    const expiredJustNow = await createMarket(
      marketInput({
        type: "popup",
        name: `Expired ${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() - 1000),
      }),
    );

    const live = await listLivePopups();
    const past = await listPastPopups();
    expect(live.map((m) => m.id)).not.toContain(expiredJustNow.id);
    expect(past.map((m) => m.id)).toContain(expiredJustNow.id);
  });

  it("treats a cancelled-but-unexpired popup as past, not live", async () => {
    const cancelled = await createMarket(
      marketInput({
        type: "popup",
        name: `Cancelled ${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    await cancelMarket(cancelled.id);

    const live = await listLivePopups();
    const past = await listPastPopups();
    expect(live.map((m) => m.id)).not.toContain(cancelled.id);
    expect(past.map((m) => m.id)).toContain(cancelled.id);
  });

  it("never lists a regular market in the past archive", async () => {
    const regular = await createMarket(marketInput({ name: `Regular ${crypto.randomUUID()}` }));
    await db.market.update({ where: { id: regular.id }, data: { active: false } });

    const past = await listPastPopups();
    expect(past.map((m) => m.id)).not.toContain(regular.id);
  });

  it("lists a still-live popup with a future expiry", async () => {
    const live = await createMarket(
      marketInput({
        type: "popup",
        name: `Live ${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    );

    const result = await listLivePopups();
    expect(result.map((m) => m.id)).toContain(live.id);
  });
});

describe("listPastPopups ordering + limit", () => {
  it("orders by expiresAt descending", async () => {
    // Other tests in this file share the same D1 instance, so assert relative
    // order within our own marked rows rather than exact positions — a large
    // limit keeps every row (ours and others') in the result to filter from.
    const marker = crypto.randomUUID();
    const base = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const created = await Promise.all(
      [0, 1, 2, 3].map((days) =>
        createMarket(
          marketInput({
            type: "popup",
            name: `Ordered ${marker} ${days}`,
            expiresAt: new Date(base + days * 24 * 60 * 60 * 1000),
          }),
        ),
      ),
    );

    const result = await listPastPopups(1000);
    const ours = result.filter((m) => m.name.startsWith(`Ordered ${marker}`));
    expect(ours.map((m) => m.id)).toEqual([created[3], created[2], created[1], created[0]].map((m) => m.id));
  });

  it("respects the limit", async () => {
    const result = await listPastPopups(1);
    expect(result).toHaveLength(1);
  });
});

describe("createMarket / updateMarket / getMarket", () => {
  it("creates, fetches, and fully replaces a market's fields", async () => {
    const created = await createMarket(marketInput({ name: `Create ${crypto.randomUUID()}`, county: "Marin" }));
    const fetched = await getMarket(created.id);
    expect(fetched?.county).toBe("Marin");

    const updated = await updateMarket(created.id, marketInput({ name: "Renamed", county: null }));
    expect(updated.name).toBe("Renamed");
    expect(updated.county).toBeNull();
  });

  it("returns null from getMarket for an unknown id", async () => {
    expect(await getMarket("does-not-exist")).toBeNull();
  });
});

describe("deriveMarketStatus (single-row version of C4, powers the public detail page)", () => {
  it("returns 'active' for an active regular market, 'inactive' once deactivated", async () => {
    const regular = await createMarket(marketInput({ name: `Status ${crypto.randomUUID()}` }));
    expect(deriveMarketStatus(regular)).toBe("active");
    const deactivated = await cancelMarket(regular.id);
    expect(deriveMarketStatus(deactivated!)).toBe("inactive");
  });

  it("returns 'live' for an unexpired, uncancelled popup and 'past' once expired or cancelled", async () => {
    const popup = await createMarket(
      marketInput({ type: "popup", name: `Status ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) }),
    );
    expect(deriveMarketStatus(popup)).toBe("live");

    const cancelled = await cancelMarket(popup.id);
    expect(deriveMarketStatus(cancelled!)).toBe("past");
  });
});

describe("cancelMarket (C6)", () => {
  it("sets cancelledAt on a popup, leaving active untouched", async () => {
    const popup = await createMarket(
      marketInput({ type: "popup", name: `CancelPopup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) }),
    );
    const result = await cancelMarket(popup.id);
    expect(result?.cancelledAt).not.toBeNull();
    expect(result?.active).toBe(true);
  });

  it("sets active=false on a regular market, leaving cancelledAt null", async () => {
    const regular = await createMarket(marketInput({ name: `CancelRegular ${crypto.randomUUID()}` }));
    const result = await cancelMarket(regular.id);
    expect(result?.active).toBe(false);
    expect(result?.cancelledAt).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await cancelMarket("does-not-exist")).toBeNull();
  });
});
