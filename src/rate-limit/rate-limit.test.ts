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

  it("leaves live buckets alone when the sweep runs", async () => {
    const key = uniqueKey();

    // Two of three used.
    await increment(key, "otpSend");
    await increment(key, "otpSend");

    const swept = await vitestInvoke<{ removed: number; remaining: number }>("rateLimitSweep");
    expect(swept.remaining).toBeGreaterThan(0);

    // The bucket is still mid-window, so the third is the last one allowed.
    expect((await increment(key, "otpSend")).allowed).toBe(true);
    expect((await increment(key, "otpSend")).allowed).toBe(false);
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
