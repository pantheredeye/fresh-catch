import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import { createRequest, listRequestItems } from "./queries";
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
    items: [{ species: `Salmon ${crypto.randomUUID()}`, quantity: null, notes: null, isCustom: false }],
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
          "items[0].species": species,
          "items[0].quantity": "1 whole",
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

  it("grows and submits a multi-fish walk-up via the no-JS row builder (issue 105)", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const a = `Halibut ${crypto.randomUUID()}`;
    const b = `Wahoo ${crypto.randomUUID()}`;

    // "Add another fish" round-trips the form with a second row, no request created.
    const addRes = await post("/admin/requests", cookie, {
      requestType: "fish",
      "items[0].species": a,
      action: "add-row",
      csrfToken,
    });
    expect(addRes.status).toBe(200);
    const addHtml = await addRes.text();
    expect(addHtml).toContain("Fish 2");
    expect(addHtml).toContain(a);

    const res = await post("/admin/requests", cookie, {
      requestType: "fish",
      "items[0].species": a,
      "items[0].quantity": "2 lbs",
      "items[1].species": b,
      contactName: "Walk-up",
      contactPhone: "555-0101",
      csrfToken,
    });
    expect(res.status).toBe(302);
    const id = res.headers.get("location")!.split("/").pop();

    // Header card lists every item; inbox collapses to "+1 more".
    const threadHtml = await (await app.request(`/admin/requests/${id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(threadHtml).toContain(`${a} — 2 lbs`);
    expect(threadHtml).toContain(b);

    const inboxHtml = await (await app.request("/admin/requests", { headers: { Cookie: cookie } }, env)).text();
    expect(inboxHtml).toContain("+1 more");
  });

  it("shows a Not on list badge for custom items in the header card (issue 105)", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(
      fishInput({
        items: [
          { species: `Salmon ${crypto.randomUUID()}`, quantity: null, notes: null, isCustom: false },
          { species: `Opah ${crypto.randomUUID()}`, quantity: "1 whole", notes: null, isCustom: true },
        ],
      }),
      { deviceToken: crypto.randomUUID(), userId: null },
    );

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Not on list");
  });

  it("400s an invalid vendor-initiated submission with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/requests",
      {
        method: "POST",
        body: new URLSearchParams({
          requestType: "fish",
          "items[0].species": "",
          contactName: "Walk-up",
          csrfToken,
        }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Add at least one fish");
  });
});

describe("#65 confirm order + mark paid in person", () => {
  it("confirms an order, posts a quote message, and shows the summary on both admin and customer sides", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(fishInput({ contactEmail: "buyer@example.com" }), {
      deviceToken,
      userId: null,
    });

    const ctx = createExecutionContext();
    const confirmRes = await app.request(
      `/admin/requests/${request.id}/confirm-order`,
      {
        method: "POST",
        body: new URLSearchParams({ price: "45.50", deposit: "10", csrfToken }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(confirmRes.status).toBe(302);

    const adminHtml = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(adminHtml).toContain("$45.50");
    expect(adminHtml).toContain("Deposit: $10.00");
    expect(adminHtml).toContain("Unpaid");
    expect(adminHtml).toContain("Quoted $45.50");

    const customerHtml = await (
      await app.request(`/requests/${request.id}`, { headers: { Cookie: `device=${deviceToken}` } }, env)
    ).text();
    expect(customerHtml).toContain("$45.50");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toBe("buyer@example.com");
  });

  it("lists the order's items on the summary card with TBD pricing until quoted per item (issue 105)", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const a = `Halibut ${crypto.randomUUID()}`;
    const b = `Wahoo ${crypto.randomUUID()}`;
    const request = await createRequest(
      fishInput({
        items: [
          { species: a, quantity: "2 lbs", notes: null, isCustom: false },
          { species: b, quantity: null, notes: null, isCustom: true },
        ],
      }),
      { deviceToken: crypto.randomUUID(), userId: null },
    );

    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "90", csrfToken });

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain(`${a} — 2 lbs · Price TBD`);
    expect(html).toContain(`${b} · Price TBD`);
  });

  it("400s a non-numeric price with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const res = await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "abc", csrfToken });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Price must be a number");
  });

  it("400s confirming an already-confirmed thread", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "10", csrfToken });

    const res = await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "10", csrfToken });
    expect(res.status).toBe(400);
  });

  it("403s confirm-order and mark-paid for non-admins", async () => {
    const { cookie: adminCookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    await post(`/admin/requests/${request.id}/confirm-order`, adminCookie, { price: "10", csrfToken });

    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const confirmRes = await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "10", csrfToken });
    expect(confirmRes.status).toBe(403);
    const payRes = await post(`/admin/requests/${request.id}/mark-paid`, cookie, { amount: "10", method: "cash", csrfToken });
    expect(payRes.status).toBe(403);
  });

  it("records a payment, bumps amountPaid, and marks the order paid once fully covered", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "20", csrfToken });

    const partialRes = await post(`/admin/requests/${request.id}/mark-paid`, cookie, {
      amount: "12",
      method: "venmo",
      csrfToken,
    });
    expect(partialRes.status).toBe(302);

    let html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Paid so far: $12.00");
    expect(html).toContain("Unpaid");

    await post(`/admin/requests/${request.id}/mark-paid`, cookie, { amount: "8", method: "cash", csrfToken });
    html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Paid so far: $20.00");
    expect(html).toContain(">Paid<");
  });

  it("400s marking paid when there's no order yet", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const res = await post(`/admin/requests/${request.id}/mark-paid`, cookie, { amount: "10", method: "cash", csrfToken });
    expect(res.status).toBe(400);
  });

  it("403s confirm-order and mark-paid without a csrf token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const confirmRes = await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "10" });
    expect(confirmRes.status).toBe(403);
    const payRes = await post(`/admin/requests/${request.id}/mark-paid`, cookie, { amount: "10", method: "cash" });
    expect(payRes.status).toBe(403);
  });
});

describe("#60 request payment (Stripe)", () => {
  const stripeEnv = () =>
    ({
      ...(env as unknown as Bindings),
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_CONNECT_ACCOUNT_ID: "acct_evan",
    }) as unknown as Bindings;

  async function confirmedThread(cookie: string, csrfToken: string, price = "50") {
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price, csrfToken });
    return request;
  }

  it("offers the payment action on an unpaid order once Stripe is configured", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(cookie, csrfToken);

    const html = await (
      await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, stripeEnv())
    ).text();

    expect(html).toContain("Request payment ($50.00)");
    expect(html).toContain(`/admin/requests/${request.id}/request-payment`);
  });

  it("hides the payment action entirely when Stripe is unconfigured — payments are flippable", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(cookie, csrfToken);

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();

    expect(html).not.toContain("Request payment");
    // ...and #65's in-person path is untouched.
    expect(html).toContain("Mark paid");
  });

  it("400s the payment action with a settle-in-person message when Stripe is unconfigured", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(cookie, csrfToken);

    const res = await post(`/admin/requests/${request.id}/request-payment`, cookie, { csrfToken });

    expect(res.status).toBe(400);
    expect(await res.text()).toContain("in person");
  });

  it("400s a thread with no order yet", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });

    const res = await app.request(
      `/admin/requests/${request.id}/request-payment`,
      { method: "POST", body: new URLSearchParams({ csrfToken }), headers: { ...formHeaders, Cookie: cookie } },
      stripeEnv(),
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Confirm an order");
  });

  it("403s without a CSRF token", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(cookie, csrfToken);

    const res = await post(`/admin/requests/${request.id}/request-payment`, cookie, {});

    expect(res.status).toBe(403);
  });

  it("403s a non-admin", async () => {
    const { cookie: adminCookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(adminCookie, csrfToken);
    const nonAdmin = await mintNonAdminSession(env as unknown as Bindings);

    const res = await post(`/admin/requests/${request.id}/request-payment`, nonAdmin.cookie, {
      csrfToken: nonAdmin.csrfToken,
    });

    expect(res.status).toBe(403);
  });

  it("stops offering the action once the order is fully settled", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const request = await confirmedThread(cookie, csrfToken);
    await post(`/admin/requests/${request.id}/mark-paid`, cookie, { amount: "50", method: "cash", csrfToken });

    const html = await (
      await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, stripeEnv())
    ).text();

    expect(html).not.toContain("Request payment");
    expect(html).toContain("Paid");
  });
});

describe("issue 106 per-item vendor resolution + estimates", () => {
  async function twoFishThread(deviceToken = crypto.randomUUID()) {
    const a = `Halibut ${crypto.randomUUID()}`;
    const b = `Trout ${crypto.randomUUID()}`;
    const request = await createRequest(
      fishInput({
        contactEmail: "buyer@example.com",
        items: [
          { species: a, quantity: "2 lbs", notes: null, isCustom: false },
          { species: b, quantity: null, notes: null, isCustom: true },
        ],
      }),
      { deviceToken, userId: null },
    );
    const items = await listRequestItems(request.id);
    return { request, items, a, b, deviceToken };
  }

  function resolutionFields(items: { id: string }[], csrfToken: string, overrides: Record<string, string> = {}) {
    return {
      "items[0].id": items[0].id,
      "items[0].status": "available",
      "items[0].price": "24.00",
      "items[0].vendorNote": "",
      "items[1].id": items[1].id,
      "items[1].status": "unavailable",
      "items[1].price": "",
      "items[1].vendorNote": "none this week",
      action: "save",
      csrfToken,
      ...overrides,
    };
  }

  it("saves per-item status/price and shows the resolution on both admin and customer threads", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items, a, b, deviceToken } = await twoFishThread();

    const res = await post(`/admin/requests/${request.id}/items`, cookie, resolutionFields(items, csrfToken));
    expect(res.status).toBe(302);

    const adminHtml = await (
      await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)
    ).text();
    expect(adminHtml).toContain("Available");
    expect(adminHtml).toContain("$24.00");
    expect(adminHtml).toContain("Unavailable");
    expect(adminHtml).toContain("none this week");

    const customerHtml = await (
      await app.request(`/requests/${request.id}`, { headers: { Cookie: `device=${deviceToken}` } }, env)
    ).text();
    expect(customerHtml).toContain(a);
    expect(customerHtml).toContain(b);
    expect(customerHtml).toContain("Available");
    expect(customerHtml).toContain("$24.00");
    expect(customerHtml).toContain("Unavailable");
  });

  it("shows a market-rate line instead of inventing a price", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items } = await twoFishThread();

    await post(
      `/admin/requests/${request.id}/items`,
      cookie,
      resolutionFields(items, csrfToken, {
        "items[0].price": "",
        "items[0].marketRate": "on",
        "items[1].status": "available",
      }),
    );

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("market rate");
  });

  it("save-estimate also posts the running estimate into the thread and emails the customer", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items, a, b } = await twoFishThread();

    const ctx = createExecutionContext();
    const res = await app.request(
      `/admin/requests/${request.id}/items`,
      {
        method: "POST",
        body: new URLSearchParams(resolutionFields(items, csrfToken, { action: "save-estimate" })),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(302);

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Here&#39;s where your order stands:");
    expect(html).toContain(`${a} — 2 lbs: available · $24.00`);
    expect(html).toContain(`${b}: unavailable (none this week)`);
    expect(html).toContain("Estimated total: $24.00.");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toBe("buyer@example.com");
  });

  it("pre-fills the confirm form from item prices and flags the unpriced remainder", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items } = await twoFishThread();

    await post(
      `/admin/requests/${request.id}/items`,
      cookie,
      resolutionFields(items, csrfToken, { "items[1].status": "requested", "items[1].vendorNote": "" }),
    );

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain('value="24.00"');
    expect(html).toContain("1 item not yet priced");
  });

  it("confirm quote message lists the resolution, unavailable lines included", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items, a, b } = await twoFishThread();

    await post(`/admin/requests/${request.id}/items`, cookie, resolutionFields(items, csrfToken));
    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "24", csrfToken });

    const html = await (await app.request(`/admin/requests/${request.id}`, { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Quoted $24.00 for this order.");
    expect(html).toContain(`${a} — 2 lbs: available · $24.00`);
    expect(html).toContain(`${b}: unavailable (none this week)`);
    // The order snapshot froze the resolution too.
    expect(html).toContain("$24.00");
  });

  it("400s an invalid price with the error rendered inline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items } = await twoFishThread();

    const res = await post(
      `/admin/requests/${request.id}/items`,
      cookie,
      resolutionFields(items, csrfToken, { "items[0].price": "abc", "items[1].vendorNote": "unsaved draft note" }),
    );
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Price must be a number");
    // The re-render echoes what was typed — the other row's unsaved edits survive.
    expect(html).toContain('value="abc"');
    expect(html).toContain("unsaved draft note");
  });

  it("400s resolution once an order has frozen the snapshot", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const { request, items } = await twoFishThread();
    await post(`/admin/requests/${request.id}/confirm-order`, cookie, { price: "30", csrfToken });

    const res = await post(`/admin/requests/${request.id}/items`, cookie, resolutionFields(items, csrfToken));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("frozen");
  });

  it("rejects item ids from another thread", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const mine = await twoFishThread();
    const other = await twoFishThread();

    const res = await post(
      `/admin/requests/${mine.request.id}/items`,
      cookie,
      resolutionFields(other.items, csrfToken),
    );
    expect(res.status).toBe(400);
  });

  it("403s non-admins and missing csrf", async () => {
    const { csrfToken: adminCsrf, cookie: adminCookie } = await mintAdminSession(env as unknown as Bindings);
    const { request, items } = await twoFishThread();

    const noCsrf = await post(`/admin/requests/${request.id}/items`, adminCookie, {
      ...resolutionFields(items, adminCsrf),
      csrfToken: "",
    });
    expect(noCsrf.status).toBe(403);

    const { cookie, csrfToken } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await post(`/admin/requests/${request.id}/items`, cookie, resolutionFields(items, csrfToken));
    expect(res.status).toBe(403);
  });
});
