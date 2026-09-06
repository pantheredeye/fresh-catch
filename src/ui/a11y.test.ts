import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import app from "../index";
import { mintAdminSession } from "@/features/auth/test-helpers";
import { createMarket } from "@/features/markets/queries";
import { createRequest } from "@/features/requests/queries";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

/**
 * Pinning §4's a11y floors (skip link, one landmark <main>, one <h1>, labeled
 * fields) so a future route can't silently regress them — see #61 block C.
 * String/regex assertions, not a DOM parser, matching this repo's existing
 * test style (no HTML-parsing dependency in the project).
 */
function assertA11yFloors(html: string, path: string) {
  expect(html, `${path}: <html lang="en">`).toMatch(/<html[^>]*\blang="en"/);
  expect(html, `${path}: color-scheme meta`).toMatch(/<meta name="color-scheme" content="light dark"\s*\/?>/);

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  expect(h1Count, `${path}: exactly one <h1>`).toBe(1);

  expect(html, `${path}: a <main id="main"> landmark`).toMatch(/<main id="main"/);

  const bodyIndex = html.indexOf("<body");
  expect(bodyIndex, `${path}: has a <body>`).toBeGreaterThanOrEqual(0);
  const firstFocusable = html.slice(bodyIndex).match(/<(a|button|input|select|textarea)\b[^>]*>/);
  expect(firstFocusable?.[0], `${path}: skip link is the first focusable element`).toMatch(
    /^<a href="#main" class="skip-link"/,
  );

  for (const match of html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = match[0];
    if (/\btype="hidden"/.test(tag)) continue;
    if (/\baria-label="/.test(tag)) continue;

    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const hasMatchingLabel = Boolean(id && html.includes(`for="${id}"`));

    const before = html.slice(0, match.index);
    const lastLabelOpen = before.lastIndexOf("<label");
    const lastLabelClose = before.lastIndexOf("</label>");
    const isImplicitlyWrapped = lastLabelOpen > lastLabelClose && !/\bfor="/.test(before.slice(lastLabelOpen, lastLabelOpen + 60));

    expect(hasMatchingLabel || isImplicitlyWrapped, `${path}: ${tag} has no associated label`).toBe(true);
  }
}

describe("a11y floors across every GET HTML route", () => {
  let marketId: string;
  let requestId: string;
  let adminCookie: string;

  beforeAll(async () => {
    const market = await createMarket({
      type: "regular",
      name: `A11y Market ${crypto.randomUUID()}`,
      schedule: "Sat 8-2",
      subtitle: null,
      locationDetails: null,
      customerInfo: null,
      catchPreview: null,
      notes: null,
      county: null,
      city: null,
      expiresAt: null,
    });
    marketId = market.id;

    // origin: "vendor" requests are viewable by anyone (queries.ts:canViewRequest)
    // — sidesteps needing a matching device-token cookie for this fixture.
    const request = await createRequest(
      {
        requestType: "fish",
        species: "Halibut",
        quantity: "2 lbs",
        notes: null,
        contactName: "A11y Tester",
        contactEmail: null,
        contactPhone: null,
      },
      { deviceToken: null, userId: null },
      { origin: "vendor", status: "confirmed" },
    );
    requestId = request.id;

    adminCookie = (await mintAdminSession(env as unknown as Bindings)).cookie;
  });

  function routes(): Array<{ path: string; init?: RequestInit }> {
    return [
      { path: "/" },
      { path: "/markets/past" },
      { path: `/markets/${marketId}` },
      { path: "/requests/new" },
      { path: "/requests" },
      { path: `/requests/${requestId}` },
      { path: "/login" },
      { path: "/dev/showcase" },
      { path: "/admin", init: { headers: { Cookie: adminCookie } } },
      { path: "/admin/markets", init: { headers: { Cookie: adminCookie } } },
      { path: "/admin/markets/new", init: { headers: { Cookie: adminCookie } } },
      { path: `/admin/markets/${marketId}/edit`, init: { headers: { Cookie: adminCookie } } },
      { path: "/admin/catch", init: { headers: { Cookie: adminCookie } } },
      { path: "/admin/requests", init: { headers: { Cookie: adminCookie } } },
      { path: "/admin/requests/new", init: { headers: { Cookie: adminCookie } } },
      { path: `/admin/requests/${requestId}`, init: { headers: { Cookie: adminCookie } } },
    ];
  }

  it("holds for every route", async () => {
    for (const { path, init } of routes()) {
      const res = await app.request(path, init, env);
      expect(res.status, `${path}: expected 200`).toBe(200);
      assertA11yFloors(await res.text(), path);
    }
  });
});

// Vite resolves this glob at build time to string literals — no runtime `fs`
// access, which the Workers test runtime doesn't have. `notifications.ts` /
// `receipt.ts` / `email.ts` (inline-styled email HTML by necessity) are `.ts`,
// not `.tsx`, so this pattern excludes them without an explicit allowlist.
const tsxSources = import.meta.glob("/src/**/*.tsx", { eager: true, query: "?raw", import: "default" }) as Record<
  string,
  string
>;

/** §3.8's root cause, pinned: every color must be authored as a paired token, not a literal. */
describe("no raw colour literals outside email templates", () => {
  const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

  it("finds no hex or rgba() literals in src/**/*.tsx", () => {
    const offenders = Object.entries(tsxSources)
      .filter(([, content]) => COLOR_LITERAL.test(content))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
