import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import { createRequest } from "./queries";
import type { RequestInput } from "./validation";
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

describe("#64 email alerts on admin reply", () => {
  it("emails the customer when contactEmail is on file", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput({ contactEmail: "customer@example.com" }), {
      deviceToken: crypto.randomUUID(),
      userId: null,
    });

    const ctx = createExecutionContext();
    await app.request(
      `/admin/requests/${request.id}/messages`,
      { method: "POST", body: new URLSearchParams({ body: "We have some Friday.", csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toBe("customer@example.com");
    expect(sendEmailMock.mock.calls[0][1].html).toContain(`/requests/${request.id}`);
  });

  it("skips silently when the request has no contactEmail", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput({ contactEmail: null }), {
      deviceToken: crypto.randomUUID(),
      userId: null,
    });

    const ctx = createExecutionContext();
    const res = await app.request(
      `/admin/requests/${request.id}/messages`,
      { method: "POST", body: new URLSearchParams({ body: "We have some Friday.", csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(302);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("#64 vendor-initiated requests", () => {
  it("403s the new-request form and POST for non-admins", async () => {
    const getRes = await app.request("/admin/requests/new", {}, env);
    expect(getRes.status).toBe(403);

    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/requests/new", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it("creates a confirmed, vendor-origin request with a vendor opening message and emails the customer", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const species = `Rockfish ${crypto.randomUUID()}`;

    const ctx = createExecutionContext();
    const res = await app.request(
      "/admin/requests",
      {
        method: "POST",
        body: new URLSearchParams({
          requestType: "fish",
          species,
          quantity: "1 whole",
          notes: "",
          contactName: "Walk-up",
          contactEmail: "walkup@example.com",
          contactPhone: "",
          csrfToken,
        }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(302);
    const id = res.headers.get("location")!.split("/").pop();

    const inboxHtml = await (await app.request("/admin/requests", { headers: { Cookie: cookie } }, env)).text();
    expect(inboxHtml).toContain(species);

    const threadHtml = await (await app.request(`/admin/requests/${id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(threadHtml).toContain("Confirmed");
    expect(threadHtml).toContain(species);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toBe("walkup@example.com");

    // A brand-new anonymous device (no matching deviceToken/userId) can still open the
    // thread — the emailed deep link to the unguessable id is the access control (#64).
    const strangerRes = await app.request(`/requests/${id}`, {}, env);
    expect(strangerRes.status).toBe(200);
    expect(await strangerRes.text()).toContain(species);
  });

  it("400s an invalid vendor-initiated submission with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/requests",
      {
        method: "POST",
        body: new URLSearchParams({
          requestType: "fish",
          species: "",
          contactName: "Walk-up",
          csrfToken,
        }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Species is required");
  });
});
