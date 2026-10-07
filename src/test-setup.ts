import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, vi } from "vitest";

// The test D1 starts empty. Apply all migrations once so tests that touch
// tables (Market, FishRequest, LoginCode, …) have a real schema.
beforeAll(async () => {
  const e = env as unknown as { DB: D1Database; TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
  await applyD1Migrations(e.DB, e.TEST_MIGRATIONS);
});

// Guard: tests must never reach the live Resend API. Tests exercising the
// real send path pass a fake key in the env override and stub fetch themselves.
const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (new URL(url).hostname === "api.resend.com") {
      throw new Error("Test attempted a live Resend API call — stub fetch or sendEmail");
    }
    return realFetch(input, init);
  });
});
