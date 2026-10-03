import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { db, setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { sha256Hex } from "@/lib/hash";
import { createLoginCode, normalizeEmail, verifyLoginCode } from "./login-codes";

function uniqueEmail() {
  return `otp-${crypto.randomUUID()}@example.com`;
}

describe("login codes", () => {
  it("accepts the correct code once, then treats it as used", async () => {
    await setupDb(env as unknown as Bindings);
    const email = uniqueEmail();
    const code = await createLoginCode(email);

    const first = await verifyLoginCode(email, code);
    expect(first.valid).toBe(true);
    expect(first.email).toBe(email.toLowerCase());

    // Single-use: the record is deleted on success.
    const second = await verifyLoginCode(email, code);
    expect(second.valid).toBe(false);
  });

  it("locks the code after 5 wrong attempts", async () => {
    await setupDb(env as unknown as Bindings);
    const email = uniqueEmail();
    const code = await createLoginCode(email);

    for (let i = 0; i < 5; i++) {
      await verifyLoginCode(email, code === "000000" ? "111111" : "000000");
    }

    const afterLock = await verifyLoginCode(email, code);
    expect(afterLock.valid).toBe(false);
    expect(afterLock.locked).toBe(true);
  });

  it("rejects an expired code", async () => {
    await setupDb(env as unknown as Bindings);
    const email = uniqueEmail();
    const code = await createLoginCode(email);
    const emailHash = await sha256Hex(normalizeEmail(email));
    await db.loginCode.update({
      where: { emailHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await verifyLoginCode(email, code);
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it("resend issues a fresh code, invalidates the old one, and resets attempts", async () => {
    await setupDb(env as unknown as Bindings);
    const email = uniqueEmail();
    const first = await createLoginCode(email);

    // Burn an attempt against the first code.
    await verifyLoginCode(email, first === "000000" ? "111111" : "000000");

    const second = await createLoginCode(email);
    expect(second).not.toBe(first); // practically always distinct

    // Old code is dead after resend.
    const oldResult = await verifyLoginCode(email, first);
    expect(oldResult.valid).toBe(false);

    // New code works — attempts were reset, so the earlier wrong try
    // does not count against it.
    const newResult = await verifyLoginCode(email, second);
    expect(newResult.valid).toBe(true);
  });
});
