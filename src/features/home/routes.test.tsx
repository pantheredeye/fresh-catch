import { env } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import app from "../../index";
import { createMarket, cancelMarket } from "@/features/markets/queries";
import { publishCatchUpdate } from "@/features/catch/queries";
import { fishKind } from "./fish-art";
import type { MarketInput } from "@/features/markets/validation";
import { localParts } from "@/lib/format";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
  await db.vendor.deleteMany();
  await db.vendor.create({
    data: { id: "test-vendor", name: "2 Fishes Seafood Test", displayName: "Evan", phone: "+15055550142", timezone: "UTC" },
  });
});

const createdMarketIds: string[] = [];

// Every market created in a test is cancelled/deactivated afterward — status
// (`resolveToday`) considers every active market in the DB, so leftovers
// from one test would leak into another test's "which market is featured"
// assertions.
afterEach(async () => {
  await Promise.all(createdMarketIds.splice(0).map((id) => cancelMarket(id)));
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
    address: null,
    landmark: null,
    dayOfWeek: null,
    openMinutes: null,
    closeMinutes: null,
    expiresAt: null,
    ...overrides,
  };
}

async function addMarket(overrides: Partial<MarketInput> = {}) {
  const market = await createMarket(marketInput(overrides));
  createdMarketIds.push(market.id);
  return market;
}

/** UTC weekday/minutes-of-day for "now" — the vendor's test timezone is UTC, so these line up directly with `dayOfWeek`/`openMinutes`/`closeMinutes`. */
function nowUtcParts() {
  const now = new Date();
  return { weekday: now.getUTCDay(), minutesOfDay: now.getUTCHours() * 60 + now.getUTCMinutes() };
}

describe("GET / — fish board", () => {
  it("shows a row with a price, a row with no price, and a sold-out row", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "redfish 16 a pound, mullet, flounder sold out",
      formattedContent: JSON.stringify({
        headline: "h",
        items: [
          { name: "Redfish", note: "Line-caught.", priceCents: 1600 },
          { name: "Mullet", note: "Bait or table fare." },
          { name: "Flounder", note: "Back next week.", soldOut: true },
        ],
        summary: "s",
      }),
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Request Redfish, $16 a pound");
    expect(html).toContain("Request Mullet");
    expect(html).not.toContain("Request Flounder"); // sold-out row is a non-link
    expect(html).toContain("Sold out");
    expect(html).toContain("/requests/new?type=question&amp;species=Flounder");
    expect(html).toContain('Ask about <span class="nowrap">it<svg');
    expect(html).not.toContain("next week");
  });

  it("renders no fish descriptions; sold-out tag sits inside the h3", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "x",
      formattedContent: JSON.stringify({
        headline: "h",
        items: [
          { name: "Mullet", note: "Skinned, 2 lb average." },
          { name: "Flounder", note: "Gone.", soldOut: true },
        ],
        summary: "s",
      }),
    });
    const html = await (await app.request("/", {}, env)).text();
    expect(html).not.toContain("Skinned, 2 lb average.");
    expect(html).toMatch(/<h3>\s*Flounder\s*<span class="tag tag-muted">Sold out<\/span>\s*<\/h3>/);
  });

  it("fishKind helper", () => {
    expect(fishKind("Sea Bass")).toBe("bass");
    expect(fishKind("Crawfish")).toBe("crawfish");
    expect(fishKind("Pompano")).toBe("fish");
  });

  it("shows a plain notice when there's no fresh catch update at all", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Check back soon — nothing posted yet this week.");
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
    expect(html).not.toContain("Cod");
    expect(html).toContain("Check back soon");
  });
});

describe("GET / — public page polish (#82)", () => {
  async function publish(items: object[]) {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "t",
      formattedContent: JSON.stringify({ headline: "h", items, summary: "s" }),
    });
  }

  it("omits 'per pound' and says call/text for price when nothing is priced", async () => {
    await publish([{ name: "Mullet", note: "Fresh." }]);
    const html = await (await app.request("/", {}, env)).text();
    expect(html).not.toContain("per pound");
    expect(html).toContain("Call/text for price.");
  });

  it("no phone: no 'Call' copy, request button in closing band", async () => {
    await publish([{ name: "Mullet", note: "Fresh." }]);
    const vendor = await db.vendor.findFirst();
    await db.vendor.update({ where: { id: vendor!.id }, data: { phone: null } });
    try {
      const html = await (await app.request("/", {}, env)).text();
      expect(html).not.toContain("Call/text");
      expect(html).not.toContain("Call or text");
      expect(html).toContain("Ask for a price.");
      expect(html).toMatch(/<a href="\/requests\/new"[^>]*>Request a hold<\/a>/);
    } finally {
      await db.vendor.update({ where: { id: vendor!.id }, data: { phone: vendor!.phone } });
    }
  });

  it("footer: © year + Digital Glue link, no trailing period", async () => {
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain(`© ${new Date().getFullYear()} <a href="https://www.digitalglue.dev">Digital Glue</a>`);
    expect(html).not.toContain("Digital Glue</a>.");
  });

  it("shows 'per pound' when at least one item is priced", async () => {
    await publish([{ name: "Redfish", note: "Fresh.", priceCents: 1600 }, { name: "Mullet", note: "Fresh." }]);
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("per pound");
    expect(html).not.toContain("Call/text for price.");
  });

  it("uses the vendor display name, ends the week-of stamp with a period, and drops the star copy", async () => {
    await publish([{ name: "Mullet", note: "Fresh." }]);
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toMatch(/Week of \w+ \d+\. The list is set each Monday\./);
    expect(html).not.toContain("Sam");
    expect(html).not.toContain("Star a market");
    expect(html).toContain("We&#39;ll touch base");
    expect(html).toContain("Want one held?");
    expect(html).toMatch(/<div class="band band-deep home-closing"/);
  });

  it("renders the sticky action bar and a normalized sms: link when the vendor has a phone", async () => {
    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain('class="action-bar"');
    expect(html).toContain('href="/requests/new"');
    expect(html).toContain('href="sms:+15055550142"');
  });

  it("omits the action bar when the vendor has no phone", async () => {
    await db.vendor.update({ where: { id: "test-vendor" }, data: { phone: null } });
    try {
      const html = await (await app.request("/", {}, env)).text();
      expect(html).not.toContain('class="action-bar"');
    } finally {
      await db.vendor.update({ where: { id: "test-vendor" }, data: { phone: "+15055550142" } });
    }
  });
});

describe("GET / — market status states (handoff §4)", () => {
  it("open: strip says 'Open now' and the hero features the open market", async () => {
    const { weekday, minutesOfDay } = nowUtcParts();
    const market = await addMarket({
      name: `OpenMarket ${crypto.randomUUID()}`,
      dayOfWeek: weekday,
      openMinutes: Math.max(0, minutesOfDay - 60),
      closeMinutes: Math.min(1439, minutesOfDay + 60),
      address: "1 Test St",
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Open now");
    expect(html).toContain(`<h1 class="hero-name">${market.name}</h1>`);
    expect(html).toContain(`aria-label="Directions to ${market.name}"`);
    expect(html).toContain("Directions →");
    expect(html).not.toContain(`>Directions to ${market.name}<`);
    expect(html).toContain("Call Evan");
  });

  it("opens-later: strip says 'Opens later today' for a market not open yet", async () => {
    // Near UTC midnight there's no room left in the day for a "later today"
    // window — clamping to 1439 collapses close <= open, the market loses its
    // structured hours, and the page falls back to schedule-only (no strip).
    // Pin the vendor to the fixed-offset zone whose local time is mid-day so
    // the window always fits, whatever the wall clock says.
    const offsetHours = new Date().getUTCHours() - 12; // Etc/GMT+N means UTC-N
    const tz = offsetHours === 0 ? "UTC" : offsetHours > 0 ? `Etc/GMT+${offsetHours}` : `Etc/GMT-${-offsetHours}`;
    await db.vendor.update({ where: { id: "test-vendor" }, data: { timezone: tz } });
    try {
      const local = localParts(new Date(), tz);
      const openMinutes = local.hour * 60 + local.minute + 30;
      const market = await addMarket({
        name: `LaterMarket ${crypto.randomUUID()}`,
        dayOfWeek: local.weekday,
        openMinutes,
        closeMinutes: openMinutes + 60,
      });

      const html = await (await app.request("/", {}, env)).text();
      expect(html).toContain("Opens later today");
      expect(html).toContain(`<h1 class="hero-name">${market.name}</h1>`);
    } finally {
      await db.vendor.update({ where: { id: "test-vendor" }, data: { timezone: "UTC" } });
    }
  });

  it("closed-today: strip says 'Closed today' and the hero falls forward to the next stop", async () => {
    const { weekday } = nowUtcParts();
    const otherDay = (weekday + 2) % 7;
    const market = await addMarket({
      name: `LaterWeekMarket ${crypto.randomUUID()}`,
      dayOfWeek: otherDay,
      openMinutes: 10 * 60,
      closeMinutes: 18 * 60,
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain("Closed today");
    expect(html).toContain("No market today. Next stop");
    expect(html).toContain(`<h1 class="hero-name">${market.name}</h1>`);
  });

  it("no-structured-data: no status strip; hero falls back to the market's free-text schedule", async () => {
    const market = await addMarket({
      name: `ScheduleOnly ${crypto.randomUUID()}`,
      schedule: "Every other Saturday, call ahead",
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).not.toContain("Open now");
    expect(html).not.toContain("Closed today");
    expect(html).not.toContain("Opens later today");
    expect(html).toContain(`<h1 class="hero-name">${market.name}</h1>`);
    expect(html).toContain("Every other Saturday, call ahead");
  });

  it("a live popup leads the hero over a regular market open the same day (epic #69, locked)", async () => {
    const { weekday, minutesOfDay } = nowUtcParts();
    const regularMarket = await addMarket({
      name: `RegularOpen ${crypto.randomUUID()}`,
      dayOfWeek: weekday,
      openMinutes: Math.max(0, minutesOfDay - 60),
      closeMinutes: Math.min(1439, minutesOfDay + 60),
    });
    const popupMarket = await addMarket({
      type: "popup",
      name: `LivePopup ${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain(`<h1 class="hero-name">${popupMarket.name}</h1>`);
    expect(html).toContain(regularMarket.name); // still listed on the route below
  });
});

describe("GET / — route + saved band", () => {
  it("lists active regular markets and live popups, excludes inactive/past ones, and links to /markets/past", async () => {
    const active = await addMarket({ name: `Active ${crypto.randomUUID()}` });
    const inactiveSource = await addMarket({ name: `Inactive ${crypto.randomUUID()}` });
    await cancelMarket(inactiveSource.id);
    const livePopup = await addMarket({
      type: "popup",
      name: `LivePopupRoute ${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const pastPopup = await addMarket({
      type: "popup",
      name: `PastPopup ${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const html = await (await app.request("/", {}, env)).text();
    expect(html).toContain(active.name);
    expect(html).not.toContain(inactiveSource.name);
    expect(html).toContain(livePopup.name);
    expect(html).not.toContain(pastPopup.name);
    expect(html).toContain('href="/markets/past"');
    expect(html).toContain(`href="/markets/${active.id}"`);
    expect(html).toContain("Our markets");
    expect(html).toContain(">Popups<");
  });

  it("tags the hero market's row 'Next stop' when it isn't today", async () => {
    const { weekday } = nowUtcParts();
    const market = await addMarket({
      name: `NextStop ${crypto.randomUUID()}`,
      dayOfWeek: (weekday + 2) % 7,
      openMinutes: 10 * 60,
      closeMinutes: 18 * 60,
    });
    const html = await (await app.request("/", {}, env)).text();
    const row = html.slice(html.indexOf('<div class="mk', html.lastIndexOf(`href="/markets/${market.id}"`) - 400));
    expect(row.slice(0, 400)).toContain("Next stop");
  });

  it("hides the Popups section when no popup is live", async () => {
    await db.market.updateMany({ where: { type: "popup" }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    const html = await (await app.request("/", {}, env)).text();
    expect(html).not.toContain(">Popups<");
  });

  it("sparse market row: no empty hrs2, no Directions", async () => {
    const m = await addMarket({ name: `Sparse ${crypto.randomUUID()}`, schedule: "", address: null });
    const html = await (await app.request("/", {}, env)).text();
    const row = html.slice(html.indexOf(m.name) - 200).split("</div>")[0];
    expect(row).not.toContain("hrs2");
    expect(row).not.toContain("Directions");
  });

  it("renders a hidden saved-band pin, keyed by market id, for a market with a computable occurrence", async () => {
    const { weekday } = nowUtcParts();
    const market = await addMarket({
      name: `Pinned ${crypto.randomUUID()}`,
      dayOfWeek: weekday,
      openMinutes: 0,
      closeMinutes: 1439,
    });

    const html = await (await app.request("/", {}, env)).text();
    const bandTag = html.match(/<div class="band band-paper saved"[^>]*>/)?.[0];
    expect(bandTag).toContain("hidden");
    expect(html).toContain(`data-market-id="${market.id}"`);
  });
});
