import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import app from "../../index";
import { createMarket, cancelMarket } from "@/features/markets/queries";
import { publishCatchUpdate } from "@/features/catch/queries";
import type { MarketInput } from "@/features/markets/validation";

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

describe("GET /", () => {
  it("shows a fresh live catch update", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "mahi mahi",
      formattedContent: JSON.stringify({ headline: "Big Haul Today", items: [{ name: "Mahi Mahi", note: "" }], summary: "s" }),
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Big Haul Today");
  });

  it("hides a stale (>7 day old) live catch update", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    const stale = await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "old news",
      formattedContent: JSON.stringify({ headline: "Stale Headline", items: [{ name: "Cod", note: "" }], summary: "s" }),
    });
    await db.catchUpdate.update({
      where: { id: stale.id },
      data: { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).not.toContain("Stale Headline");
    expect(html).toContain("Check back soon");
  });

  it("hides the hero when there is no live catch update at all", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Check back soon");
  });

  it("lists active regular markets and live popups, excludes inactive/past ones, and links to /markets/past", async () => {
    const active = await createMarket(marketInput({ name: `Active ${crypto.randomUUID()}` }));
    const inactiveSource = await createMarket(marketInput({ name: `Inactive ${crypto.randomUUID()}` }));
    await cancelMarket(inactiveSource.id);
    const livePopup = await createMarket(
      marketInput({ type: "popup", name: `LivePopup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) }),
    );
    const pastPopup = await createMarket(
      marketInput({ type: "popup", name: `PastPopup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() - 60_000) }),
    );

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain(active.name);
    expect(html).not.toContain(inactiveSource.name);
    expect(html).toContain(livePopup.name);
    expect(html).not.toContain(pastPopup.name);
    expect(html).toContain('href="/markets/past"');
  });
});
