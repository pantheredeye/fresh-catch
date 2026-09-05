import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { checkRateLimit } from "./rate-limit";

function uniqueEmail() {
  return `rl-${crypto.randomUUID()}@example.com`;
}

describe("OTP rate limiting", () => {
  // The regression #26 fixed on v1: every request here shares one IP, so
  // under IP-only keying the second customer would have been locked out.
  it("does not let one email's limit lock out a different email on the same IP", async () => {
    await setupDb(env as unknown as Bindings);
    const ip = crypto.randomUUID();
    const first = uniqueEmail();

    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(ip, "otpSend", first)).allowed).toBe(true);
    }
    const fourth = await checkRateLimit(ip, "otpSend", first);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);

    // Same IP, different person — must still be able to log in.
    const second = uniqueEmail();
    expect((await checkRateLimit(ip, "otpSend", second)).allowed).toBe(true);
  });

  it("keys the identity bucket on the normalized email", async () => {
    const ip = crypto.randomUUID();
    const email = uniqueEmail();
    const shouty = email.toUpperCase();

    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(ip, "otpSend", ` ${shouty} `)).allowed).toBe(true);
    }

    // Casing and surrounding whitespace must not buy a fresh bucket.
    expect((await checkRateLimit(ip, "otpSend", email)).allowed).toBe(false);
  });

  it("tracks otpVerify separately from otpSend for the same email", async () => {
    const ip = crypto.randomUUID();
    const email = uniqueEmail();

    for (let i = 0; i < 3; i++) await checkRateLimit(ip, "otpSend", email);
    expect((await checkRateLimit(ip, "otpSend", email)).allowed).toBe(false);

    // Exhausting sends must not also block code entry.
    expect((await checkRateLimit(ip, "otpVerify", email)).allowed).toBe(true);
  });

});

describe("per-IP ceiling", () => {
  // The ceiling is the abuse backstop — many distinct emails from one host.
  it("denies once the IP ceiling is exhausted", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 100; i++) {
      expect((await checkRateLimit(ip, "otpSend", uniqueEmail())).allowed).toBe(true);
    }
    const over = await checkRateLimit(ip, "otpSend", uniqueEmail());
    expect(over.allowed).toBe(false);
    expect(over.retryAfterMs).toBeGreaterThan(0);
  });

  it("does not burn the identity's own slot when only the IP ceiling denies", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 100; i++) {
      await checkRateLimit(ip, "otpSend", uniqueEmail());
    }

    const fresh = uniqueEmail();
    const denied = await checkRateLimit(ip, "otpSend", fresh);
    expect(denied.allowed).toBe(false);

    // Move to a fresh IP so only the identity bucket is in play — if the
    // denial above had written to it, this would allow fewer than 3.
    const otherIp = crypto.randomUUID();
    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(otherIp, "otpSend", fresh)).allowed).toBe(true);
    }
  });
});

describe("IP-only bucket (no identity)", () => {
  it("keys purely on IP when no identity is passed", async () => {
    const ip = crypto.randomUUID();
    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(ip, "otpSend")).allowed).toBe(true);
    }
    expect((await checkRateLimit(ip, "otpSend")).allowed).toBe(false);
  });
});
