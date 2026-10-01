import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Bindings } from "@/types";
import { mintAdminSession, mintNonAdminSession } from "@/features/auth/test-helpers";
import app from "../../index";

const VALID_JSON = JSON.stringify({
  headline: "Big Haul",
  items: [{ name: "Mahi Mahi", note: "Fresh off the boat" }],
  summary: "A great catch today.",
});

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

/** Stubs `env.AI` (C9 — no local emulation) rather than calling the real remote binding in tests. */
function envWithFakeAi(response: string) {
  return { ...(env as unknown as Bindings), AI: { run: async () => ({ response }) } as unknown as Ai };
}

function envWithoutAi() {
  return { ...(env as unknown as Bindings), AI: undefined };
}

describe("GET /admin/catch", () => {
  it("403s an unauthenticated request", async () => {
    const res = await app.request("/admin/catch", {}, env);
    expect(res.status).toBe(403);
  });

  it("403s a non-admin request", async () => {
    const { cookie } = await mintNonAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/catch", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it("renders for an admin", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request("/admin/catch", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Catch of the week");
  });

  it("renders a labelled preview box with an empty state", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const html = await (await app.request("/admin/catch", { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Preview will appear here");
    expect(html).toContain('id="catch-preview-label"');
  });
});

describe("POST /admin/catch/record", () => {
  it("403s an unauthenticated request", async () => {
    const res = await app.request(
      "/admin/catch/record",
      { method: "POST", body: JSON.stringify({ text: "x" }), headers: { "Content-Type": "application/json" } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("formats text via a stubbed AI binding, without a CSRF token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/catch/record",
      {
        method: "POST",
        body: JSON.stringify({ text: "mahi mahi, fresh off the boat" }),
        headers: { "Content-Type": "application/json", Cookie: cookie },
      },
      envWithFakeAi(VALID_JSON),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { formatted: { headline: string }; rawTranscript: string };
    expect(body.formatted.headline).toBe("Big Haul");
    expect(body.rawTranscript).toBe("mahi mahi, fresh off the boat");
  });

  it("falls back to a deterministic draft when the AI binding is unset", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/catch/record",
      {
        method: "POST",
        body: JSON.stringify({ text: "Red Snapper — big one" }),
        headers: { "Content-Type": "application/json", Cookie: cookie },
      },
      envWithoutAi(),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { formatted: { headline: string; items: unknown[] } };
    expect(body.formatted.headline).toBe("Today's Catch");
    expect(body.formatted.items).toEqual([{ name: "Red Snapper", note: "big one" }]);
  });

  it("400s blank text", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/catch/record",
      { method: "POST", body: JSON.stringify({ text: "  " }), headers: { "Content-Type": "application/json", Cookie: cookie } },
      envWithoutAi(),
    );
    expect(res.status).toBe(400);
  });

  it("501s audio input when the AI binding is unset", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/catch/record",
      {
        method: "POST",
        body: new Uint8Array([1, 2, 3]),
        headers: { "Content-Type": "audio/webm", Cookie: cookie },
      },
      envWithoutAi(),
    );
    expect(res.status).toBe(501);
  });
});

describe("POST /admin/catch/publish", () => {
  async function publish(cookie: string, csrfToken: string, overrides: Record<string, string> = {}) {
    return app.request(
      "/admin/catch/publish",
      {
        method: "POST",
        body: new URLSearchParams({
          csrfToken,
          headline: `Headline ${crypto.randomUUID()}`,
          summary: "A great catch today.",
          itemsJson: JSON.stringify([{ name: "Mahi Mahi", note: "Fresh" }]),
          rawTranscript: "mahi mahi, fresh",
          ...overrides,
        }),
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
      },
      env,
    );
  }

  it("403s without a CSRF token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await publish(cookie, "wrong-token");
    expect(res.status).toBe(403);
  });

  it("400s an over-limit headline", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    const res = await publish(cookie, csrfToken, { headline: "x".repeat(201) });
    expect(res.status).toBe(400);
  });

  it("publishes, archiving whatever was live before", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);

    const first = await publish(cookie, csrfToken, { headline: "First Catch" });
    expect(first.status).toBe(302);

    const afterFirst = await app.request("/admin/catch", { headers: { Cookie: cookie } }, env);
    expect(await afterFirst.text()).toContain("First Catch");

    const second = await publish(cookie, csrfToken, { headline: "Second Catch" });
    expect(second.status).toBe(302);

    const afterSecond = await app.request("/admin/catch", { headers: { Cookie: cookie } }, env);
    const html = await afterSecond.text();
    expect(html).toContain("Second Catch");
    expect(html).not.toContain("First Catch");
  });
});

describe("POST /admin/catch/prices", () => {
  async function publishOneItem(cookie: string, csrfToken: string) {
    return app.request(
      "/admin/catch/publish",
      {
        method: "POST",
        body: new URLSearchParams({
          csrfToken,
          headline: `Headline ${crypto.randomUUID()}`,
          summary: "A great catch today.",
          itemsJson: JSON.stringify([{ name: "Mahi Mahi", note: "Fresh" }]),
          rawTranscript: "mahi mahi, fresh",
        }),
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
      },
      env,
    );
  }

  it("403s an unauthenticated request", async () => {
    const res = await app.request(
      "/admin/catch/prices",
      { method: "POST", body: new URLSearchParams({ csrfToken: "x" }), headers: formHeaders },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("403s without a valid CSRF token", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const res = await app.request(
      "/admin/catch/prices",
      { method: "POST", body: new URLSearchParams({ csrfToken: "wrong" }), headers: { ...formHeaders, Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("updates price and sold-out on the live catch, shown on GET /admin/catch", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    await publishOneItem(cookie, csrfToken);

    const res = await app.request(
      "/admin/catch/prices",
      {
        method: "POST",
        body: new URLSearchParams({ csrfToken, price_0: "12.50", soldOut_0: "on" }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );
    expect(res.status).toBe(302);

    const html = await (await app.request("/admin/catch", { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("$12.50");
    expect(html).toContain("Sold out");
  });

  it("400s an invalid price, re-rendering the page with the error", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    await publishOneItem(cookie, csrfToken);

    const res = await app.request(
      "/admin/catch/prices",
      {
        method: "POST",
        body: new URLSearchParams({ csrfToken, price_0: "not-a-price" }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Enter a valid price");
  });

  it("clearing a price removes it (degrades cleanly to no-price)", async () => {
    const { cookie, csrfToken } = await mintAdminSession(env as unknown as Bindings);
    await publishOneItem(cookie, csrfToken);

    await app.request(
      "/admin/catch/prices",
      {
        method: "POST",
        body: new URLSearchParams({ csrfToken, price_0: "12.50" }),
        headers: { ...formHeaders, Cookie: cookie },
      },
      env,
    );

    const cleared = await app.request(
      "/admin/catch/prices",
      { method: "POST", body: new URLSearchParams({ csrfToken, price_0: "" }), headers: { ...formHeaders, Cookie: cookie } },
      env,
    );
    expect(cleared.status).toBe(302);

    const html = await (await app.request("/admin/catch", { headers: { Cookie: cookie } }, env)).text();
    expect(html).not.toContain("$12.50");
  });
});
