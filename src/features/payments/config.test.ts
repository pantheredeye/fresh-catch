import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { resolveStripeConfig } from "./config";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

beforeEach(async () => {
  await db.vendor.deleteMany();
});

function bindings(overrides: Partial<Bindings> = {}): Bindings {
  return { ...(env as unknown as Bindings), ...overrides };
}

describe("resolveStripeConfig", () => {
  it("returns null without a secret key — payments are a flippable module", async () => {
    await db.vendor.create({ data: { name: "Evan", stripeAccountId: "acct_db" } });
    expect(await resolveStripeConfig(bindings({ STRIPE_SECRET_KEY: undefined }))).toBeNull();
  });

  it("returns null when no connected account is configured anywhere", async () => {
    await db.vendor.create({ data: { name: "Evan" } });
    expect(await resolveStripeConfig(bindings({ STRIPE_SECRET_KEY: "sk_test_x" }))).toBeNull();
  });

  it("prefers STRIPE_CONNECT_ACCOUNT_ID over Vendor.stripeAccountId", async () => {
    await db.vendor.create({ data: { name: "Evan", stripeAccountId: "acct_db", platformFeeBps: 750 } });

    const config = await resolveStripeConfig(
      bindings({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_CONNECT_ACCOUNT_ID: "acct_env" }),
    );

    expect(config).toEqual({ secretKey: "sk_test_x", connectedAccountId: "acct_env", platformFeeBps: 750 });
  });

  it("falls back to the vendor row's account and fee", async () => {
    await db.vendor.create({ data: { name: "Evan", stripeAccountId: "acct_db" } });

    const config = await resolveStripeConfig(bindings({ STRIPE_SECRET_KEY: "sk_test_x" }));

    expect(config?.connectedAccountId).toBe("acct_db");
    expect(config?.platformFeeBps).toBe(500);
  });

  it("works with no vendor row at all, on the env vars alone", async () => {
    const config = await resolveStripeConfig(
      bindings({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_CONNECT_ACCOUNT_ID: "acct_env" }),
    );

    expect(config).toEqual({ secretKey: "sk_test_x", connectedAccountId: "acct_env", platformFeeBps: 500 });
  });
});
