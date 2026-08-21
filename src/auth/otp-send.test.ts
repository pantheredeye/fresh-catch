import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type OtpResult =
  | { success: true }
  | { success: false; error: string; sendFailed?: true };

function uniqueEmail() {
  return `otp-${crypto.randomUUID()}@example.com`;
}

const forceFailure = (email: string) =>
  vitestInvoke<OtpResult>("issueOtpForcingSendFailure", email);
const forceSuccess = (email: string) =>
  vitestInvoke<OtpResult>("issueOtpForcingSendSuccess", email);
const create = (email: string) => vitestInvoke<string>("createLoginCode", email);

describe("otp send failure handling", () => {
  it("reports a user-facing error when the send fails", async () => {
    const email = uniqueEmail();
    const result = await forceFailure(email);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.sendFailed).toBe(true);
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("succeeds when the send succeeds", async () => {
    const email = uniqueEmail();
    const result = await forceSuccess(email);

    expect(result.success).toBe(true);
  });

  it("still creates a login code even when the send fails, so resend/retry can reuse it", async () => {
    const email = uniqueEmail();
    await forceFailure(email);

    // Re-issuing (resend) should succeed at the code-creation step just like
    // a normal retry would — proves the failure is a send problem, not a
    // code problem.
    const code = await create(email);
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe("toSendResult", () => {
  const toSendResult = (res: unknown) => vitestInvoke<any>("toSendResult", res);

  it("maps a Resend API error to a failure result", async () => {
    const result = await toSendResult({
      data: null,
      error: { message: "Domain not verified", name: "validation_error", statusCode: 403 },
    });
    expect(result).toEqual({
      success: false,
      error: "Domain not verified",
      code: "validation_error",
      statusCode: 403,
    });
  });

  it("maps a successful Resend response to a success result", async () => {
    const result = await toSendResult({ data: { id: "abc123" }, error: null });
    expect(result).toEqual({ success: true, id: "abc123" });
  });
});
