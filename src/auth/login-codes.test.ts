import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type VerifyResult = {
  valid: boolean;
  email?: string;
  expired?: boolean;
  locked?: boolean;
};

function uniqueEmail() {
  return `otp-${crypto.randomUUID()}@example.com`;
}

const create = (email: string) => vitestInvoke<string>("createLoginCode", email);
const verify = (email: string, code: string) =>
  vitestInvoke<VerifyResult>("verifyLoginCode", email, code);

describe("login codes", () => {
  it("accepts the correct code once, then treats it as used", async () => {
    const email = uniqueEmail();
    const code = await create(email);

    const first = await verify(email, code);
    expect(first.valid).toBe(true);
    expect(first.email).toBe(email.toLowerCase());

    // Single-use: the record is deleted on success.
    const second = await verify(email, code);
    expect(second.valid).toBe(false);
  });

  it("locks the code after 5 wrong attempts", async () => {
    const email = uniqueEmail();
    const code = await create(email);

    for (let i = 0; i < 5; i++) {
      await verify(email, "000000" === code ? "111111" : "000000");
    }

    // Correct code no longer works once locked.
    const afterLock = await verify(email, code);
    expect(afterLock.valid).toBe(false);
    expect(afterLock.locked).toBe(true);
  });

  it("rejects an expired code", async () => {
    const email = uniqueEmail();
    const code = await create(email);
    await vitestInvoke("expireLoginCode", email);

    const result = await verify(email, code);
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it("resend issues a fresh code, invalidates the old one, and resets attempts", async () => {
    const email = uniqueEmail();
    const first = await create(email);

    // Burn an attempt against the first code.
    await verify(email, first === "000000" ? "111111" : "000000");

    const second = await create(email);
    expect(second).not.toBe(first); // practically always distinct

    // Old code is dead after resend.
    const oldResult = await verify(email, first);
    expect(oldResult.valid).toBe(false);

    // New code works — attempts were reset, so the earlier wrong try
    // does not count against it.
    const newResult = await verify(email, second);
    expect(newResult.valid).toBe(true);
  });
});
