import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll } from "vitest";

// The test D1 starts empty. Apply all migrations once so tests that touch
// tables (Market, FishRequest, LoginCode, …) have a real schema.
beforeAll(async () => {
  const e = env as unknown as { DB: D1Database; TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
  await applyD1Migrations(e.DB, e.TEST_MIGRATIONS);
});
