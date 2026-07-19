/**
 * Required-secret checks for the Worker environment.
 *
 * Cloudflare Workers have no real "startup" phase to hook into — a missing
 * secret only surfaces once a request actually exercises the code path that
 * reads it. Before this, STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET were read
 * via unsafe `env as unknown as Record<string, string>` casts scattered
 * across handlers, so a missing secret meant a generic 500 deep inside
 * Stripe code with no clear signal about *why*.
 *
 * This module gives that a single, typed home:
 *  - `checkRequiredSecretsOnce` runs once per isolate (memoized) and logs a
 *    loud, unmissable banner if a required secret is absent — call it from
 *    the first middleware in worker.tsx so a bad deploy is obvious in the
 *    logs on the very first request, not just when a customer happens to
 *    hit checkout.
 *  - `requireSecret` is for call sites where the secret is unconditionally
 *    needed to proceed (webhook verification, platform Stripe account
 *    creation) — it throws a clear, consistent error instead of a bespoke
 *    message per call site.
 *
 * Not every Stripe-adjacent call site should use `requireSecret`: an
 * organization simply not having connected Stripe yet (no stripeAccountId /
 * stripeOnboardingComplete) is expected and handled by feature-gating on
 * `env.STRIPE_SECRET_KEY` directly (see order-functions.ts,
 * orders/functions.ts) — that's not a config error, just a vendor who
 * hasn't onboarded.
 */

/** Secrets required for the platform's own Stripe Connect integration to work at all. */
const REQUIRED_SECRETS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];

let checkedOnce = false;

/**
 * Logs a loud, one-time warning banner if any required secret is missing.
 * Memoized per isolate — cheap to call on every request.
 */
export function checkRequiredSecretsOnce(env: Env): void {
  if (checkedOnce) return;
  checkedOnce = true;

  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length === 0) return;

  console.error(
    [
      "",
      "############################################################",
      "# CONFIG ERROR: missing required secret(s): " + missing.join(", "),
      "# Stripe checkout, Connect onboarding, and webhooks will fail",
      "# until these are set.",
      "# Fix: wrangler secret put <NAME>   (see .env.example for the full list)",
      "############################################################",
      "",
    ].join("\n"),
  );
}

/**
 * Read a required secret, throwing a clear, consistent error if missing.
 * Use where the secret is unconditionally needed to proceed.
 */
export function requireSecret(env: Env, name: RequiredSecretName): string {
  const value = env[name];
  if (!value) {
    throw new Error(
      `[CONFIG ERROR] Missing required secret: ${name}. Set it with: wrangler secret put ${name}`,
    );
  }
  return value;
}

/** Test-only: reset the memoized check so tests can exercise both branches. */
export function __resetRequiredSecretsCheckForTests(): void {
  checkedOnce = false;
}
