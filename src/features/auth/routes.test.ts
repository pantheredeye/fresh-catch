import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Bindings } from "@/types";
import app from "../../index";
import { mintAdminSession, mintNonAdminSession } from "./test-helpers";

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

function extractDevCode(html: string): string {
  const match = html.match(/Code: (\d{6})/);
  if (!match) throw new Error(`dev code not found in response: ${html}`);
  return match[1];
}

function sessionCookie(res: Response): string {
  const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const found = cookies.find((c) => c.startsWith("session="));
  if (!found) throw new Error("no session cookie set");
  return found.split(";")[0];
}

async function loginAs(email: string) {
  const sendRes = await app.request(
    "/login",
    { method: "POST", body: new URLSearchParams({ email }), headers: formHeaders },
    env,
  );
  const code = extractDevCode(await sendRes.text());

  const verifyRes = await app.request(
    "/login/verify",
    { method: "POST", body: new URLSearchParams({ email, code }), headers: formHeaders },
    env,
  );
  return verifyRes;
}

describe("login flow", () => {
  it("requests a code and verifies it into a SameSite=Lax session cookie", async () => {
    const email = `flow-${crypto.randomUUID()}@example.com`;
    const verifyRes = await loginAs(email);

    expect(verifyRes.status).toBe(302);
    const cookie = sessionCookie(verifyRes);
    expect(cookie).toContain("session=");

    const rawSetCookie = verifyRes.headers.getSetCookie?.() ?? [];
    const sessionHeader = rawSetCookie.find((c) => c.startsWith("session="));
    expect(sessionHeader).toContain("HttpOnly");
    expect(sessionHeader).toContain("SameSite=Lax");
  });

  it("rejects an incorrect code", async () => {
    const email = `wrongcode-${crypto.randomUUID()}@example.com`;
    await app.request(
      "/login",
      { method: "POST", body: new URLSearchParams({ email }), headers: formHeaders },
      env,
    );

    const verifyRes = await app.request(
      "/login/verify",
      { method: "POST", body: new URLSearchParams({ email, code: "000000" }), headers: formHeaders },
      env,
    );
    expect(verifyRes.status).toBe(400);
    expect(await verifyRes.text()).toContain("Incorrect code");
  });

  it("grants isAdmin to an allowlisted email and lets it reach /admin", async () => {
    const adminEmail = (env as unknown as { ADMIN_EMAILS: string }).ADMIN_EMAILS.split(",")[0].trim();
    const verifyRes = await loginAs(adminEmail);
    const cookie = sessionCookie(verifyRes);

    const adminRes = await app.request("/admin", { headers: { Cookie: cookie } }, env);
    expect(adminRes.status).toBe(200);
  });

  it("blocks a non-admin from /admin", async () => {
    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);

    const adminRes = await app.request("/admin", { headers: { Cookie: cookie } }, env);
    expect(adminRes.status).toBe(403);
  });

  it("blocks logout without a matching csrf token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);

    const badLogout = await app.request(
      "/logout",
      {
        method: "POST",
        body: new URLSearchParams({ csrfToken: "wrong" }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );
    expect(badLogout.status).toBe(403);
  });
});
