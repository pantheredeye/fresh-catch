import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession } from "@/features/auth/test-helpers";
import app from "../../index";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
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
    species: `Halibut ${crypto.randomUUID()}`,
    quantity: "2 lbs",
    notes: "",
    contactName: "Jamie",
    contactEmail: "",
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
    const res = await createRequestAs(cookie, csrfToken, fishFields({ species: "" }));
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

describe("GET /requests/:id", () => {
  it("is readable with the creating device's cookie", async () => {
    const { cookie, csrfToken } = await visitAsNewDevice();
    const fields = fishFields();
    const createRes = await createRequestAs(cookie, csrfToken, fields);
    const location = createRes.headers.get("location")!;

    const res = await app.request(location, { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(fields.species);
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
    expect(await res.text()).toContain(fields.species);
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
    const id = location.split("/").pop();

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
      location.replace("/requests/", "/requests/") + "/messages",
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
    expect(await res.text()).toContain(fields.species);
  });
});
