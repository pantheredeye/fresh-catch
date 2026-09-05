/**
 * Required-secret checks for the Worker environment.
 *
 * Cloudflare Workers have no real "startup" phase — a missing secret only
 * surfaces once a request exercises the code path that reads it. This gives
 * that a single typed home instead of scattered `env as any` reads.
 */
import type { Bindings } from "../types";

const REQUIRED_SECRETS = ["SESSION_SECRET"] as const;
type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];

let checkedOnce = false;

/** Logs a loud, one-time warning if a required secret is missing. Memoized per isolate. */
export function checkRequiredSecretsOnce(env: Bindings): void {
  if (checkedOnce) return;
  checkedOnce = true;

  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length === 0) return;

  console.error(
    [
      "",
      "############################################################",
      "# CONFIG ERROR: missing required secret(s): " + missing.join(", "),
      "# Fix: wrangler secret put <NAME>   (see .env.example)",
      "############################################################",
      "",
    ].join("\n"),
  );
}

/** Read a required secret, throwing a clear error if missing. */
export function requireSecret(env: Bindings, name: RequiredSecretName): string {
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
