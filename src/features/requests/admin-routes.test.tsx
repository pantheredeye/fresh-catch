import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import { createRequest } from "./queries";
import type { RequestInput } from "./validation";
import app from "../../index";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

function fishInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    requestType: "fish",
    species: `Salmon ${crypto.randomUUID()}`,
    quantity: null,
    notes: null,
    contactName: "Jamie",
    contactEmail: null,
    contactPhone: null,
    ...overrides,
  };
}

async function post(path: string, cookie: string, fields: Record<string, string>) {
  return app.request(
    path,
    { method: "POST", body: new URLSearchParams(fields), headers: { ...formHeaders, Cookie: cookie } },
    env,
  );
}

describe("admin requests routes", () => {
  it("403s an unauthenticated request", async () => {
    const res = await app.request("/admin/requests", {}, env);
    expect(res.status).toBe(403);
  });

  it("403s a non-admin request", async () => {
    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/requests", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it("lists open+confirmed by default and excludes archived, with all/archive filters available", async () => {
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const declined = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    await post(`/admin/requests/${declined.id}/status`, cookie, { status: "declined", csrfToken });

    const defaultHtml = await (await app.request("/admin/requests", { headers: { Cookie: cookie } }, env)).text();
    expect(defaultHtml).toContain(request.species);
    expect(defaultHtml).not.toContain(declined.species);

    const archiveHtml = await (
      await app.request("/admin/requests?status=archive", { headers: { Cookie: cookie } }, env)
    ).text();
    expect(archiveHtml).toContain(declined.species);
    expect(archiveHtml).not.toContain(request.species);

    const allHtml = await (await app.request("/admin/requests?status=all", { headers: { Cookie: cookie } }, env)).text();
    expect(allHtml).toContain(request.species);
    expect(allHtml).toContain(declined.species);
  });

  it("shows the thread and lets an admin reply", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const getRes = await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env);
    expect(getRes.status).toBe(200);

    const replyRes = await post(`/admin/requests/${request.id}/messages`, cookie, {
      body: "We have some Friday.",
      csrfToken,
    });
    expect(replyRes.status).toBe(302);

    const afterHtml = await (
      await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)
    ).text();
    expect(afterHtml).toContain("We have some Friday.");
  });

  it("changes status via the reply endpoint's optional status field", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    await post(`/admin/requests/${request.id}/messages`, cookie, {
      body: "Confirmed for Saturday.",
      status: "confirmed",
      csrfToken,
    });

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Confirmed");
  });

  it("round-trips a status transition via the status endpoint", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const res = await post(`/admin/requests/${request.id}/status`, cookie, { status: "fulfilled", csrfToken });
    expect(res.status).toBe(302);

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Fulfilled");
  });

  it("403s a reply without a csrf token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const res = await post(`/admin/requests/${request.id}/messages`, cookie, { body: "no csrf" });
    expect(res.status).toBe(403);
  });

  it("404s an unknown request id", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/requests/does-not-exist", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(404);
  });
});
