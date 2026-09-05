import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import app from "../../index";
import { cancelMarket, createMarket } from "./queries";
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

describe("GET /markets/past", () => {
  it("is reachable without auth", async () => {
    const res = await app.request("/markets/past", {}, env);
    expect(res.status).toBe(200);
  });

  it("excludes a live popup, includes an expired one, includes a cancelled one, excludes a regular market", async () => {
    const live = await createMarket(
      marketInput({ type: "popup", name: `LivePopup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) }),
    );
    const expired = await createMarket(
      marketInput({ type: "popup", name: `ExpiredPopup ${crypto.randomUUID()}`, expiresAt: new Date(Date.now() - 60_000) }),
    );
    const cancelledSource = await createMarket(
      marketInput({
        type: "popup",
        name: `CancelledPopup ${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    await cancelMarket(cancelledSource.id);
    const regular = await createMarket(marketInput({ name: `RegularMarket ${crypto.randomUUID()}` }));

    const html = await (await app.request("/markets/past", {}, env)).text();
    expect(html).not.toContain(live.name);
    expect(html).toContain(expired.name);
    expect(html).toContain(cancelledSource.name);
    expect(html).not.toContain(regular.name);
  });
});

describe("GET /markets/:id", () => {
  it("is reachable without auth and renders customer-facing fields, not vendor-only ones", async () => {
    const market = await createMarket(
      marketInput({
        name: `Detail ${crypto.randomUUID()}`,
        customerInfo: "Cash or card",
        locationDetails: "Behind the red barn",
      }),
    );
    const res = await app.request(`/markets/${market.id}`, {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(market.name);
    expect(html).toContain("Cash or card");
    expect(html).not.toContain("Behind the red barn");
  });

  it("404s an unknown id", async () => {
    const res = await app.request("/markets/does-not-exist", {}, env);
    expect(res.status).toBe(404);
  });
});
