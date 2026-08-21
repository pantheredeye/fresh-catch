import { createLoginCode, normalizeEmail } from "@/auth/login-codes";
import { checkRateLimit } from "@/rate-limit/middleware";
import { sendOtpEmail } from "@/utils/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export type OtpResult =
  | { success: true }
  | {
      success: false;
      error: string;
      rateLimited?: boolean;
      retryAfterSeconds?: number;
      sendFailed?: true;
    };

/**
 * Issue an OTP: validate, rate-limit, create the code, send it, and report
 * whether the send actually worked. `send` is injectable so tests can force
 * a failure without touching the network — the exported server action never
 * passes a second argument.
 */
export async function issueOtp(
  email: string,
  send: typeof sendOtpEmail = sendOtpEmail,
): Promise<OtpResult> {
  if (!isValidEmail(email)) {
    return { success: false, error: "Invalid email" };
  }

  const rl = await checkRateLimit("otpSend", email);
  if (!rl.allowed) {
    return {
      success: false,
      error: "Too many attempts. Try again later.",
      rateLimited: true,
      retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000),
    };
  }

  const code = await createLoginCode(email);
  let result: Awaited<ReturnType<typeof sendOtpEmail>>;
  try {
    result = await send({ to: email.trim(), code });
  } catch (error) {
    // sendEmail() has its own try/catch, but sendOtpEmail() does some URL
    // parsing before it ever calls sendEmail() — a malformed APP_URL would
    // throw here rather than resolve to a SendResult. Map it the same way
    // sendEmail() maps a transport failure so it still surfaces gracefully.
    result = { success: false, error: String(error), code: "transport" };
  }

  if (result.success) {
    console.log("[OTP] sent", { email: normalizeEmail(email), id: result.id });
    return { success: true };
  }

  const isDev =
    result.skipped && typeof import.meta.env !== "undefined" && import.meta.env.DEV;
  if (isDev) {
    console.log(`[OTP][DEV] code for ${normalizeEmail(email)}: ${code}`);
    return { success: true };
  }

  console.error("[OTP][SEND_FAILED]", {
    email: normalizeEmail(email),
    code: result.code,
    statusCode: result.statusCode,
    message: result.error,
  });
  return {
    success: false,
    error: "Couldn't send the code right now. Try again in a moment.",
    sendFailed: true,
  };
}
