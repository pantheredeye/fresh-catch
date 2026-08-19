import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const check = (endpoint: string, identity?: string) =>
  vitestInvoke<RateLimitResult>("rateLimitCheck", endpoint, identity);

const increment = (key: string, endpoint: string) =>
  vitestInvoke<RateLimitResult>("rateLimitIncrement", key, endpoint);

const incrementMulti = (entries: { key: string; endpoint: string }[]) =>
  vitestInvoke<RateLimitResult>("rateLimitIncrementMulti", entries);

// Pass no arg at all rather than an explicit undefined — it would arrive as null.
const sweep = (maxAgeMs?: number) =>
  maxAgeMs === undefined
    ? vitestInvoke<{ removed: number; remaining: number }>("rateLimitSweep")
    : vitestInvoke<{ removed: number; remaining: number }>("rateLimitSweep", maxAgeMs);

function uniqueEmail() {
  return `rl-${crypto.randomUUID()}@example.com`;
}

function uniqueKey() {
  return `k-${crypto.randomUUID()}`;
}

describe("OTP rate limiting", () => {
  // The regression this whole change exists for. Every test request shares one
  // IP, so under the old IP-only keying the second customer here was locked out.
  it("does not let one email's limit lock out a different email on the same IP", async () => {
    const first = uniqueEmail();

    for (let i = 0; i < 3; i++) {
      expect((await check("otpSend", first)).allowed).toBe(true);
    }
    const fourth = await check("otpSend", first);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);

    // Same IP, different person — must still be able to log in.
    const second = uniqueEmail();
    expect((await check("otpSend", second)).allowed).toBe(true);
  });

  it("keys the identity bucket on the normalized email", async () => {
    const email = uniqueEmail();
    const shouty = email.toUpperCase();

    for (let i = 0; i < 3; i++) {
      expect((await check("otpSend", ` ${shouty} `)).allowed).toBe(true);
    }

    // Casing and surrounding whitespace must not buy a fresh bucket.
    expect((await check("otpSend", email)).allowed).toBe(false);
  });

  it("tracks otpVerify separately from otpSend for the same email", async () => {
    const email = uniqueEmail();

    for (let i = 0; i < 3; i++) await check("otpSend", email);
    expect((await check("otpSend", email)).allowed).toBe(false);

    // Exhausting sends must not also block code entry.
    expect((await check("otpVerify", email)).allowed).toBe(true);
  });
});

describe("incrementMulti", () => {
  it("consumes nothing when any bucket is over limit", async () => {
    const fresh = uniqueKey();
    const exhausted = uniqueKey();

    // otpSend allows 3; burn them on `exhausted` only.
    for (let i = 0; i < 3; i++) {
      expect((await increment(exhausted, "otpSend")).allowed).toBe(true);
    }

    const denied = await incrementMulti([
      { key: fresh, endpoint: "otpSend" },
      { key: exhausted, endpoint: "otpSend" },
    ]);
    expect(denied.allowed).toBe(false);

    // The denial must not have burned a slot on `fresh` — all 3 still available.
    for (let i = 0; i < 3; i++) {
      expect((await increment(fresh, "otpSend")).allowed).toBe(true);
    }
    expect((await increment(fresh, "otpSend")).allowed).toBe(false);
  });

  it("reports the tightest remaining count across buckets", async () => {
    const tight = uniqueKey();
    const loose = uniqueKey();

    // otpSend allows 3, otpSendIp allows 100.
    const result = await incrementMulti([
      { key: tight, endpoint: "otpSend" },
      { key: loose, endpoint: "otpSendIp" },
    ]);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});

describe("per-IP ceiling", () => {
  // The ceiling is the abuse backstop. It must actually deny once crossed —
  // otherwise the loose limits chosen above are just decoration.
  it("denies once the IP ceiling is exhausted", async () => {
    const ip = uniqueKey();

    // otpSendIp allows 100.
    for (let i = 0; i < 100; i++) {
      expect((await increment(ip, "otpSendIp")).allowed).toBe(true);
    }

    const over = await increment(ip, "otpSendIp");
    expect(over.allowed).toBe(false);
    expect(over.retryAfterMs).toBeGreaterThan(0);
  });

  // The ceiling is ~33x looser than the per-email bucket, so a single person can
  // never trip it on their own — it takes many distinct emails from one host.
  it("is far looser than the per-email bucket", async () => {
    const ip = uniqueKey();
    for (let i = 0; i < 4; i++) await increment(ip, "otpSendIp");
    // 4 sends would have exhausted an email bucket (3); the ceiling is unbothered.
    expect((await increment(ip, "otpSendIp")).allowed).toBe(true);
  });
});

describe("sweep", () => {
  it("leaves live buckets alone", async () => {
    const key = uniqueKey();

    // Two of three used.
    await increment(key, "otpSend");
    await increment(key, "otpSend");

    const swept = await sweep();
    expect(swept.remaining).toBeGreaterThan(0);

    // Still mid-window, so the third is the last one allowed — state survived.
    expect((await increment(key, "otpSend")).allowed).toBe(true);
    expect((await increment(key, "otpSend")).allowed).toBe(false);
  });

  // Regression: a null maxAgeMs (what an omitted RPC arg actually arrives as)
  // once bypassed the default and expired every live bucket.
  it("falls back to the full window when handed a junk max age", async () => {
    const key = uniqueKey();
    await increment(key, "otpSend");
    await increment(key, "otpSend");
    await increment(key, "otpSend");

    const swept = await vitestInvoke<{ removed: number; remaining: number }>(
      "rateLimitSweep",
      null,
    );
    expect(swept.removed).toBe(0);

    // Quota must still be exhausted — the bucket was not wiped.
    expect((await increment(key, "otpSend")).allowed).toBe(false);
  });

  it("deletes buckets whose window has fully expired", async () => {
    const key = uniqueKey();
    await increment(key, "otpSend");
    await increment(key, "otpSend");
    await increment(key, "otpSend");
    expect((await increment(key, "otpSend")).allowed).toBe(false);

    // maxAgeMs=0 treats every bucket as expired — exercises the delete path
    // without waiting out a 15-minute window.
    const swept = await sweep(0);
    expect(swept.removed).toBeGreaterThan(0);
    expect(swept.remaining).toBe(0);

    // Bucket is gone, so the quota is fresh again.
    expect((await increment(key, "otpSend")).allowed).toBe(true);
  });
});
