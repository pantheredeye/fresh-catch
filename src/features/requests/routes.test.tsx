import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession } from "@/features/auth/test-helpers";
import { publishCatchUpdate } from "@/features/catch/queries";
import * as emailLib from "@/lib/email";
import app from "../../index";

const sendEmailMock = vi.spyOn(emailLib, "sendEmail");

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

beforeEach(() => {
  sendEmailMock.mockClear();
});

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

/** Anonymous visits carry no cookies at all until the app sets one — `device` comes back on the response. */
async function newVisitorRequest(path: string, init: RequestInit = {}) {
  return app.request(path, init, env);
}

function extractDeviceCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/device=[^;]+/);
  if (!match) throw new Error(`no device cookie in: ${setCookie}`);
  return match[0];
}

/** POST /requests now redirects to `/requests/:id?created=1` (bead #74's confirmation banner) — strip the query before treating the tail as an id or composing another query onto it. */
function locationPath(location: string): string {
  return new URL(location, "http://x").pathname;
}

function extractCsrfToken(html: string): string {
  const match = html.match(/name="csrfToken" value="([^"]+)"/);
  if (!match) throw new Error(`no csrfToken in: ${html}`);
  return match[1];
}

async function visitAsNewDevice(path = "/requests/new") {
  const res = await newVisitorRequest(path);
  const cookie = extractDeviceCookie(res);
  const html = await res.text();
  const csrfToken = extractCsrfToken(html);
  return { cookie, csrfToken };
}

function fishFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "fish",
    "items[0].species": `Halibut ${crypto.randomUUID()}`,
    "items[0].quantity": "2 lbs",
    notes: "",
    contactName: "Jamie",
    contactEmail: "jamie@example.com",
    contactPhone: "",
    ...overrides,
  };
}

async function createRequestAs(cookie: string, csrfToken: string, fields: Record<string, string>) {
  return app.request(
    "/requests",
    { method: "POST", body: new URLSearchParams({ ...fields, csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
    env,
  );
}

describe("GET /requests/new", () => {
  it("is reachable without auth and sets a device cookie", async () => {
    const res = await newVisitorRequest("/requests/new");
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("device=");
  });
});

describe("customer form (#85)", () => {
  it("renders the segmented control, an Other-reveal and the swapped submit labels", async () => {
    const html = await (await newVisitorRequest("/requests/new?species=Flounder")).text();
    expect(html).toContain('class="segmented"');
    expect(html).toContain("submit-question");
    expect(html).toContain("Request Flounder");
    // Enter-key implicit submission must hit this hidden default, not the
    // builder's add/remove submits that come first otherwise.
    expect(html).toContain('<button type="submit" hidden');
  });

  it("offers the current-catch select (+ Other) whenever a fresh catch exists, free text only without one (issue 116)", async () => {
    // No live catch this week → free-text species is the deliberate fallback.
    let html = await (await newVisitorRequest("/requests/new")).text();
    expect(html).not.toContain('<select class="field-select" id="items-0-species"');
    expect(html).toContain("What fish are you looking for?");

    await publishCatchUpdate({
      recordedBy: null,
      rawTranscript: "t",
      formattedContent: JSON.stringify({ headline: "h", items: [{ name: "Flounder", note: "" }], summary: "s" }),
    });
    try {
      html = await (await newVisitorRequest("/requests/new")).text();
      expect(html).toContain('<select class="field-select" id="items-0-species"');
      expect(html).toContain(">Choose a fish</option>");
      expect(html).toContain('value="__other">Other</option>');
    } finally {
      await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    }
  });

  it("accepts Other + free-text species", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(cookie, csrfToken, fishFields({ "items[0].species": "__other", "items[0].speciesOther": "Wahoo" }));
    expect(res.status).toBe(302);
  });

  it("400s with no email and no phone", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(cookie, csrfToken, fishFields({ contactEmail: "", contactPhone: "" }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Add an email or phone");
  });
});

describe("POST /requests", () => {
  it("creates a request anonymously and redirects to the thread", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields();
    const res = await createRequestAs(cookie, csrfToken, fields);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^\/requests\//);
  });

  it("403s without a csrf token", async () => {
    const { cookie } = await visitAsNewDevice();
    const res = await app.request(
      "/requests",
      { method: "POST", body: new URLSearchParams(fishFields()), headers: { ...formHeaders, Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("403s with a csrf token minted for a different device", async () => {
    const a = await visitAsNewDevice();
    const b = await visitAsNewDevice();
    const res = await createRequestAs(a.cookie, b.csrfToken, fishFields());
    expect(res.status).toBe(403);
  });

  it("400s a missing species with the error rendered inline", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(cookie, csrfToken, fishFields({ "items[0].species": "" }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Species is required");
  });

  it("429s after the requestCreate limit", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await createRequestAs(cookie, csrfToken, fishFields());
    }
    expect(last?.status).toBe(429);
  });
});

/** The live rows only — the blank-row <template> also holds a details, so folded/open assertions must stop before it. */
function builderHtml(html: string): string {
  const start = html.indexOf('id="builder-rows"');
  const end = html.indexOf("<template");
  return html.slice(start, end === -1 ? undefined : end);
}

describe("folded fish rows (issue 116)", () => {
  it("renders the sole row expanded", async () => {
    const html = await (await newVisitorRequest("/requests/new")).text();
    expect(builderHtml(html)).toContain('<details class="item-details" open="">');
  });

  it("folds the completed row to its summary line after a no-JS add, keeps the new row open", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields({ action: "add-row" });
    const res = await createRequestAs(cookie, csrfToken, fields);
    expect(res.status).toBe(200);
    const html = builderHtml(await res.text());
    expect(html.match(/<details class="item-details"( open="")?>/g)).toEqual([
      '<details class="item-details">',
      '<details class="item-details" open="">',
    ]);
    // "Halibut … — 2 lbs" summary on the folded row; focus lands on the new row.
    expect(html).toContain(`${fields["items[0].species"]} — 2 lbs`);
    expect(html).toMatch(/id="items-1-species"[^>]*autofocus/);
  });

  it("expands the offending row on a 400, keeps completed rows folded", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    // Row 1 has a quantity but no species → "Species is required" on row 1 only.
    const res = await createRequestAs(cookie, csrfToken, fishFields({ "items[1].quantity": "1 lb" }));
    expect(res.status).toBe(400);
    const full = await res.text();
    expect(full).toContain("Species is required");
    expect(builderHtml(full).match(/<details class="item-details"( open="")?>/g)).toEqual([
      '<details class="item-details">',
      '<details class="item-details" open="">',
    ]);
  });
});

describe("order builder (issue 103)", () => {
  it("creates one request from multiple rows and lists each fish in the thread", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const a = `Halibut ${crypto.randomUUID()}`;
    const b = `Grouper ${crypto.randomUUID()}`;
    const res = await createRequestAs(
      cookie,
      csrfToken,
      fishFields({ "items[0].species": a, "items[1].species": b, "items[1].quantity": "1 whole", "items[1].notes": "filleted" }),
    );
    expect(res.status).toBe(302);

    const threadHtml = await (
      await app.request(locationPath(res.headers.get("location")!), { headers: { Cookie: cookie } }, env)
    ).text();
    expect(threadHtml).toContain(a);
    expect(threadHtml).toContain(b);
  });

  it("add-row re-renders an extra row, keeps typed values, and never burns the rate limit", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields({ action: "add-row" });

    // 6 round trips — one more than the requestCreate limit of 5.
    let html = "";
    for (let i = 0; i < 6; i++) {
      const res = await createRequestAs(cookie, csrfToken, fields);
      expect(res.status).toBe(200);
      html = await res.text();
    }
    expect(html).toContain('name="items[1].species"');
    expect(html).toContain(fields["items[0].species"]);
    expect(html).not.toContain("error-summary");

    // A real submit still goes through — the add taps didn't count.
    const createRes = await createRequestAs(cookie, csrfToken, fishFields());
    expect(createRes.status).toBe(302);
  });

  it("caps builder round trips on their own loose bucket", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields({ action: "add-row" });
    let last: Response | undefined;
    for (let i = 0; i < 31; i++) {
      last = await createRequestAs(cookie, csrfToken, fields);
    }
    expect(last?.status).toBe(429);
  });

  it("remove-row drops exactly the targeted row", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const keep = `Snapper ${crypto.randomUUID()}`;
    const res = await createRequestAs(
      cookie,
      csrfToken,
      fishFields({ "items[1].species": keep, action: "remove-0" }),
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(keep);
    expect(html).not.toContain('name="items[1].species"');
  });

  it("stops adding rows at the 8-fish cap", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const overrides: Record<string, string> = { action: "add-row" };
    for (let i = 1; i < 8; i++) overrides[`items[${i}].species`] = `Fish ${i}`;
    const res = await createRequestAs(cookie, csrfToken, fishFields(overrides));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('name="items[7].species"');
    expect(html).not.toContain('name="items[8].species"');
    // Still rendered (the island un-hides it after a client-side remove) but
    // hidden — invisible and inert for the no-JS flow.
    expect(html).toMatch(/<button type="submit" name="action" value="add-row" formnovalidate="" [^>]*hidden=""/);
  });

  it("re-renders every row on a 400", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const a = `Halibut ${crypto.randomUUID()}`;
    const b = `Grouper ${crypto.randomUUID()}`;
    const res = await createRequestAs(
      cookie,
      csrfToken,
      fishFields({ "items[0].species": a, "items[1].species": b, contactEmail: "", contactPhone: "" }),
    );
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain(a);
    expect(html).toContain(b);
    expect(html).toContain("Add an email or phone");
  });

  it("flags custom (Other) items on the post-submit confirmation", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(
      cookie,
      csrfToken,
      fishFields({ "items[0].species": "__other", "items[0].speciesOther": "Wahoo" }),
    );
    expect(res.status).toBe(302);
    const html = await (
      await app.request(res.headers.get("location")!, { headers: { Cookie: cookie } }, env)
    ).text();
    expect(html).toContain("availability and price will be confirmed");
  });

  it("shows a price in the species option only when the catch item is tagged", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    await publishCatchUpdate({
      recordedBy: null,
      rawTranscript: "t",
      formattedContent: JSON.stringify({
        headline: "h",
        items: [
          { name: "Halibut", note: "", priceCents: 1500 },
          { name: "Grouper", note: "" },
        ],
        summary: "s",
      }),
    });
    try {
      const html = await (await newVisitorRequest("/requests/new")).text();
      expect(html).toContain("Halibut — $15");
      expect(html).toContain(">Grouper</option>");
      expect(html).not.toContain("Grouper — $");
    } finally {
      await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    }
  });
});

/**
 * The island itself (public/js/order-builder.js) runs in the browser, not the
 * Workers runtime — these pin the server-rendered contract it hangs off:
 * rows container + data-max-items, a blank-row <template> to clone, the
 * hidden-at-the-edges add/remove buttons it toggles, and the script tag.
 */
describe("builder island (issue 104)", () => {
  it("ships the rows container, blank-row template, and cache-busted script", async () => {
    const html = await (await newVisitorRequest("/requests/new")).text();
    expect(html).toContain('<div class="stack" id="builder-rows" data-max-items="8">');
    expect(html).toContain('<template id="builder-row-template">');
    expect(html).toContain('<script type="module" src="/js/order-builder.js?v=');
    // The template row carries a visible Remove button (plus labeled fields)
    // so cloned rows arrive complete — the island renumbers value/ids/legend.
    const template = html.slice(html.indexOf('<template id="builder-row-template">'));
    expect(template).toMatch(/<button type="submit" name="action" value="remove-0" formnovalidate="" (?![^>]*hidden)/);
    expect(template).toContain('<legend>Fish 1</legend>');
    // Cloned rows arrive expanded — the island folds rows only when the user moves on (issue 116).
    expect(template).toContain('<details class="item-details" open="">');
  });

  it("renders the sole row's Remove hidden and a below-cap Add visible", async () => {
    const html = await (await newVisitorRequest("/requests/new")).text();
    expect(html).toMatch(/<button type="submit" name="action" value="remove-0" formnovalidate="" [^>]*hidden=""/);
    expect(html).toMatch(/<button type="submit" name="action" value="add-row" formnovalidate="" (?![^>]*hidden)[^>]*>Add another fish/);
  });

  it("keeps multi-row Remove buttons visible", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(cookie, csrfToken, fishFields({ action: "add-row" }));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/value="remove-0" formnovalidate="" (?![^>]*hidden)[^>]*aria-label="Remove fish 1"/);
    expect(html).toMatch(/value="remove-1" formnovalidate="" (?![^>]*hidden)[^>]*aria-label="Remove fish 2"/);
  });

  it("leaves the admin walk-up form island-free", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/requests/new", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("order-builder.js");
    expect(html).not.toContain("builder-row-template");
    expect(html).not.toContain('value="remove-0"');
  });
});

describe("GET /requests/:id", () => {
  it("is readable with the creating device's cookie", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields();
    const createRes = await createRequestAs(cookie, csrfToken, fields);
    const location = createRes.headers.get("location")!;

    const res = await app.request(location, { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(fields["items[0].species"]);
  });

  it("404s for a different device's cookie", async () => {
    const owner = await visitAsNewDevice();
    const fields = fishFields();
    const createRes = await createRequestAs(owner.cookie, owner.csrfToken, fields);
    const location = createRes.headers.get("location")!;

    const other = await visitAsNewDevice();
    const res = await app.request(location, { headers: { Cookie: other.cookie } }, env);
    expect(res.status).toBe(404);
  });

  it("is readable by an admin regardless of device", async () => {
    const owner = await visitAsNewDevice();
    const fields = fishFields();
    const createRes = await createRequestAs(owner.cookie, owner.csrfToken, fields);
    const location = createRes.headers.get("location")!;

    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(location, { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(fields["items[0].species"]);
  });

  it("404s an unknown id", async () => {
    const { cookie } = await visitAsNewDevice();
    const res = await app.request("/requests/does-not-exist", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(404);
  });
});

describe("POST /requests/:id/messages", () => {
  it("appends a customer reply and shows it in the thread", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const createRes = await createRequestAs(cookie, csrfToken, fishFields());
    const location = createRes.headers.get("location")!;
    const id = locationPath(location).split("/").pop();

    const replyRes = await app.request(
      `/requests/${id}/messages`,
      { method: "POST", body: new URLSearchParams({ body: "Any updates?", csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
    );
    expect(replyRes.status).toBe(302);

    const threadHtml = await (await app.request(location, { headers: { Cookie: cookie } }, env)).text();
    expect(threadHtml).toContain("Any updates?");
  });

  it("404s a reply from a different device", async () => {
    const owner = await visitAsNewDevice();
    const createRes = await createRequestAs(owner.cookie, owner.csrfToken, fishFields());
    const location = createRes.headers.get("location")!;

    const other = await visitAsNewDevice();
    const res = await app.request(
      `${locationPath(location)}/messages`,
      { method: "POST", body: new URLSearchParams({ body: "hi", csrfToken: other.csrfToken }), headers: { ...formHeaders, Cookie: other.cookie } },
      env,
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /requests", () => {
  it("lists a device's own requests", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields();
    await createRequestAs(cookie, csrfToken, fields);

    const res = await app.request("/requests", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(fields["items[0].species"]);
  });
});

function extractDevCode(html: string): string {
  const match = html.match(/Code: (\d{6})/);
  if (!match) throw new Error(`dev code not found in response: ${html}`);
  return match[1];
}

function sessionCookie(res: Response): string {
  const found = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("session="));
  if (!found) throw new Error("no session cookie set");
  return found.split(";")[0];
}

describe("R3: claim on login", () => {
  it("attaches a device's request to the account, visible from a fresh device cookie after login", async () => {
    const owner = await visitAsNewDevice();
    const fields = fishFields();
    const createRes = await createRequestAs(owner.cookie, owner.csrfToken, fields);
    const location = createRes.headers.get("location")!;

    const email = `claim-${crypto.randomUUID()}@example.com`;
    const sendRes = await app.request(
      "/login",
      { method: "POST", body: new URLSearchParams({ email }), headers: { ...formHeaders, Cookie: owner.cookie } },
      env,
    );
    const code = extractDevCode(await sendRes.text());
    const verifyRes = await app.request(
      "/login/verify",
      { method: "POST", body: new URLSearchParams({ email, code }), headers: { ...formHeaders, Cookie: owner.cookie } },
      env,
    );
    const session = sessionCookie(verifyRes);

    // Fresh device cookie (no device= from `owner`) + the new session — the claim, not the device token, must carry it.
    const freshDeviceRes = await app.request("/requests", { headers: { Cookie: session } }, env);
    const freshDeviceCookie = extractDeviceCookie(freshDeviceRes);

    const res = await app.request(
      "/requests",
      { headers: { Cookie: `${session}; ${freshDeviceCookie}` } },
      env,
    );
    expect(await res.text()).toContain(fields["items[0].species"]);

    const threadRes = await app.request(location, { headers: { Cookie: `${session}; ${freshDeviceCookie}` } }, env);
    expect(threadRes.status).toBe(200);
  });
});

describe("#64 email alerts", () => {
  it("alerts the vendor on a new request", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields();
    const ctx = createExecutionContext();
    const res = await app.request(
      "/requests",
      { method: "POST", body: new URLSearchParams({ ...fields, csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(302);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].subject).toContain(fields["items[0].species"]);
  });

  it("alerts the vendor on a customer reply", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const createCtx = createExecutionContext();
    const createRes = await app.request(
      "/requests",
      { method: "POST", body: new URLSearchParams({ ...fishFields(), csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
      createCtx,
    );
    await waitOnExecutionContext(createCtx);
    const location = createRes.headers.get("location")!;
    sendEmailMock.mockClear();

    const ctx = createExecutionContext();
    const res = await app.request(
      `${locationPath(location)}/messages`,
      { method: "POST", body: new URLSearchParams({ body: "Any updates?", csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(302);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].html).toContain(`/admin/requests/${locationPath(location).split("/").pop()}`);
  });
});

describe("#60 checkout return notice", () => {
  async function threadForNewDevice() {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const res = await createRequestAs(cookie, csrfToken, fishFields());
    return { cookie, path: locationPath(res.headers.get("location")!) };
  }

  it("acknowledges a successful return from Stripe Checkout", async () => {
    const { cookie, path } = await threadForNewDevice();

    const res = await app.request(`${path}?checkout=success`, { headers: { Cookie: cookie } }, env);

    expect(await res.text()).toContain("Payment received");
  });

  it("says nothing was charged after a cancelled checkout", async () => {
    const { cookie, path } = await threadForNewDevice();

    const res = await app.request(`${path}?checkout=cancel`, { headers: { Cookie: cookie } }, env);

    expect(await res.text()).toContain("nothing was charged");
  });

  it("shows no banner on a plain thread view", async () => {
    const { cookie, path } = await threadForNewDevice();

    const res = await app.request(path, { headers: { Cookie: cookie } }, env);

    expect(await res.text()).not.toContain("class=\"notice");
  });
});
