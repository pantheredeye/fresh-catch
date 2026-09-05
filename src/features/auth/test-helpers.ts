import type { Bindings } from "@/types";
import { requireSecret } from "@/lib/env";
import { createSessionValue, SESSION_COOKIE_NAME } from "./session";
import { generateCsrfToken } from "./csrf";

export interface MintedSession {
  cookie: string;
  csrfToken: string;
  email: string;
}

/**
 * Mints a signed session cookie directly (skipping the OTP flow) for tests
 * that just need an authenticated request. Replaces the ad-hoc `loginAs`
 * that used to live in routes.test.ts.
 */
export async function mintAdminSession(env: Bindings, email = "admin@example.com"): Promise<MintedSession> {
  const csrfToken = generateCsrfToken();
  const secret = requireSecret(env, "SESSION_SECRET");
  const value = await createSessionValue({ userId: crypto.randomUUID(), email, isAdmin: true, csrfToken }, secret);
  return { cookie: `${SESSION_COOKIE_NAME}=${value}`, csrfToken, email };
}

export async function mintNonAdminSession(env: Bindings, email = "customer@example.com"): Promise<MintedSession> {
  const csrfToken = generateCsrfToken();
  const secret = requireSecret(env, "SESSION_SECRET");
  const value = await createSessionValue({ userId: crypto.randomUUID(), email, isAdmin: false, csrfToken }, secret);
  return { cookie: `${SESSION_COOKIE_NAME}=${value}`, csrfToken, email };
}
