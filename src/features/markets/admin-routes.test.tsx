import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import app from "../../index";

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

function regularFields(overrides: Record<string, string> = {}) {
  return {
    type: "regular",
    name: `Test Market ${crypto.randomUUID()}`,
    schedule: "Sat 8-2",
    customerInfo: "",
    catchPreview: "",
    notes: "",
    county: "",
    city: "",
    ...overrides,
  };
}

function popupFields(overrides: Record<string, string> = {}) {
  return {
    ...regularFields(),
    type: "popup",
    name: `Test Popup ${crypto.randomUUID()}`,
    expiresDate: "2099-12-31",
    expiresTime: "1080",
    ...overrides,
  };
}

/** Other tests share this D1 instance and may list other markets — find the id next to our own row, not just the first one on the page. */
function extractIdFor(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<strong>${escaped}</strong>.*?/admin/markets/([^/]+)/edit`, "s"));
  if (!match) throw new Error(`row for "${name}" not found in: ${html}`);
  return match[1];
}

async function post(path: string, cookie: string, fields: Record<string, string>) {
  return app.request(
    path,
    { method: "POST", body: new URLSearchParams(fields), headers: { ...formHeaders, Cookie: cookie } },
    env,
  );
}

describe("admin markets routes", () => {
  it("403s an unauthenticated request", async () => {
    const res = await app.request("/admin/markets", {}, env);
    expect(res.status).toBe(403);
  });

  it("403s a non-admin request", async () => {
    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/markets", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it("creates a regular market and lists it", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields();
    const createRes = await post("/admin/markets", cookie, { ...fields, csrfToken });
    expect(createRes.status).toBe(302);

    const listRes = await app.request("/admin/markets", { headers: { Cookie: cookie } }, env);
    expect(listRes.status).toBe(200);
    expect(await listRes.text()).toContain(fields.name);
  });

  it("shows no Active/Live badge on healthy markets", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields();
    await post("/admin/markets", cookie, { ...fields, csrfToken });
    const html = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain(fields.name);
    expect(html).not.toMatch(/class="badge[^"]*">(Active|Live)</);
  });

  it("creates a popup with an expiry and lists it under live", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = popupFields();
    const createRes = await post("/admin/markets", cookie, { ...fields, csrfToken });
    expect(createRes.status).toBe(302);

    const listRes = await app.request("/admin/markets", { headers: { Cookie: cookie } }, env);
    const html = await listRes.text();
    expect(html).toContain(fields.name);
    expect(html).toContain("Live popups");
  });

  it("403s a create POST without a CSRF token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/markets", cookie, regularFields());
    expect(res.status).toBe(403);
  });

  it("400s an over-limit name with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields({ name: "x".repeat(201) });
    const res = await post("/admin/markets", cookie, { ...fields, csrfToken });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Name must be 200 characters or less");
  });

  it("cancels a popup, dropping it off the live list", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = popupFields();
    await post("/admin/markets", cookie, { ...fields, csrfToken });

    const listHtml = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    const id = extractIdFor(listHtml, fields.name);

    const cancelRes = await post(`/admin/markets/${id}/cancel`, cookie, { csrfToken });
    expect(cancelRes.status).toBe(302);

    const afterHtml = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    const liveSection = afterHtml.split("Live popups")[1].split("Past popups")[0];
    expect(liveSection).not.toContain(fields.name);
  });

  it("edits a market and shows the updated fields", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields();
    await post("/admin/markets", cookie, { ...fields, csrfToken });

    const listHtml = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    const id = extractIdFor(listHtml, fields.name);

    const updateRes = await post(`/admin/markets/${id}`, cookie, {
      ...fields,
      name: "Renamed Market",
      csrfToken,
    });
    expect(updateRes.status).toBe(302);

    const afterHtml = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    expect(afterHtml).toContain("Renamed Market");
  });

  it("creates a market with address, landmark, and structured hours, prefilled on edit", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields({
      address: "123 Main St",
      landmark: "Next to the gas station",
      dayOfWeek: "6",
      openTime: "510",
      closeTime: "840",
    });
    const createRes = await post("/admin/markets", cookie, { ...fields, csrfToken });
    expect(createRes.status).toBe(302);

    const listHtml = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    const id = extractIdFor(listHtml, fields.name);

    const editHtml = await (
      await app.request(`/admin/markets/${id}/edit`, { headers: { Cookie: cookie } }, env)
    ).text();
    expect(editHtml).toContain("123 Main St");
    expect(editHtml).toContain("Next to the gas station");
    expect(editHtml).toContain('value="6" selected');
  });

  it("400s a partial set of hours (all-or-none)", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = regularFields({ dayOfWeek: "6" });
    const res = await post("/admin/markets", cookie, { ...fields, csrfToken });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("leave day, opens, and closes all blank");
    expect(html).toContain('href="#openTime"');
    expect(html).toMatch(/<select[^>]*id="openTime"[^>]*autofocus|<select[^>]*autofocus[^>]*id="openTime"/);
  });

  it("saves a popup with partial hours (hours are ignored)", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/markets", cookie, { ...popupFields({ dayOfWeek: "6" }), csrfToken });
    expect(res.status).toBe(302);
  });

  it("400s a past popup expiry with a summary and focus on the field", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/markets", cookie, {
      ...popupFields({ expiresDate: "2020-01-01" }),
      csrfToken,
    });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("error-summary");
    expect(html).toContain("End time has passed");
    expect(html).toContain('href="#expiresTime"');
    expect(html).toMatch(/<select[^>]*id="expiresTime"[^>]*autofocus|<select[^>]*autofocus[^>]*id="expiresTime"/);
  });

  it("flashes a saved notice after create and lists past popups", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const fields = popupFields();
    const createRes = await post("/admin/markets", cookie, { ...fields, csrfToken });
    const location = createRes.headers.get("location")!;
    expect(location).toContain("saved=created");
    const html = await (await app.request(location, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Popup saved — live until");

    const id = extractIdFor(html, fields.name);
    await post(`/admin/markets/${id}/cancel`, cookie, { csrfToken });
    const after = await (await app.request("/admin/markets", { headers: { Cookie: cookie } }, env)).text();
    expect(after).toContain("Past popups");
    expect(after).toContain(fields.name);
    expect(after).toContain("Cancelled");
  });
});
