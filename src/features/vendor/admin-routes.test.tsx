import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import app from "../../index";

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
  await db.vendor.deleteMany();
  await db.vendor.create({ data: { id: "test-vendor", name: "Fresh Catch Seafood Markets" } });
});

async function post(path: string, cookie: string, fields: Record<string, string>) {
  return app.request(path, { method: "POST", body: new URLSearchParams(fields), headers: { ...formHeaders, Cookie: cookie } }, env);
}

describe("admin vendor routes", () => {
  it("403s an unauthenticated request", async () => {
    const res = await app.request("/admin/vendor", {}, env);
    expect(res.status).toBe(403);
  });

  it("403s a non-admin request", async () => {
    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/vendor", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it("renders for an admin", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/vendor", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Vendor settings");
  });

  it("403s a POST without a CSRF token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/vendor", cookie, { displayName: "Evan", phone: "+16625551234" });
    expect(res.status).toBe(403);
  });

  it("saves phone and display name, prefilled on the next GET", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/vendor", cookie, { displayName: "Evan", phone: "+16625551234", csrfToken });
    expect(res.status).toBe(302);

    const html = await (await app.request("/admin/vendor", { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Evan");
    expect(html).toContain("+16625551234");
  });

  it("400s an invalid phone with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await post("/admin/vendor", cookie, { phone: "call-evan", csrfToken });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Enter a valid phone number");
  });
});
