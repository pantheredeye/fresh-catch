import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "./index";

describe("app", () => {
  it("GET / renders the home page", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Fresh Catch");
  });

  it("GET /health reports db connectivity", async () => {
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
