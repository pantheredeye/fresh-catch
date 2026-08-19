interface Limit {
  maxRequests: number;
  windowMs: number;
}

const TEN_MIN = 10 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * Limits per endpoint.
 *
 * Auth endpoints use TWO buckets (see middleware.ts):
 *   - a tight per-identity (email) bucket, which is the real control
 *   - a loose per-IP ceiling named `<endpoint>Ip`, which is only an abuse backstop
 *
 * The IP ceilings are deliberately generous. Login is OTP-email-only, so a bucket
 * that bites shared NAT (market wifi, mobile CGNAT, an office) locks real customers
 * out of the only way in — many people behind one IP is normal, not suspicious.
 * Per-identity limits are what bound the real harm (mail-bombing a given inbox);
 * an IP ceiling only stops a crude single-host flood, and a botnet routes around it.
 */
export const ENDPOINT_LIMITS = {
  otpSend: { maxRequests: 3, windowMs: FIFTEEN_MIN },       // per EMAIL
  otpSendIp: { maxRequests: 100, windowMs: FIFTEEN_MIN },   // per-IP ceiling
  otpVerify: { maxRequests: 10, windowMs: FIFTEEN_MIN },    // per EMAIL
  otpVerifyIp: { maxRequests: 200, windowMs: FIFTEEN_MIN }, // per-IP ceiling
  chatCreate: { maxRequests: 15, windowMs: TEN_MIN },       // per IP
  chatEmail: { maxRequests: 20, windowMs: FIFTEEN_MIN },    // per IP
  orderCreate: { maxRequests: 5, windowMs: FIFTEEN_MIN },   // per IP
} as const satisfies Record<string, Limit>;

export type RateLimitEndpoint = keyof typeof ENDPOINT_LIMITS;

/**
 * Endpoints that actually have a matching `<endpoint>Ip` ceiling defined, and are
 * therefore safe to call with an identity.
 *
 * WHY this is a type and not a convention: passing an identity for an endpoint with
 * no `<endpoint>Ip` entry would silently fall back to DEFAULT_LIMIT (20/15min per
 * IP), quietly reintroducing the shared-NAT lockout this whole design exists to
 * prevent. Make that a compile error instead of a latent outage.
 */
export type IdentityEndpoint = {
  [K in RateLimitEndpoint]: `${K}Ip` extends RateLimitEndpoint ? K : never;
}[RateLimitEndpoint];

/** Fallback for an endpoint missing from the table. Should be unreachable. */
export const DEFAULT_LIMIT: Limit = { maxRequests: 20, windowMs: FIFTEEN_MIN };

/** Longest window any endpoint uses — a key untouched for longer is dead. */
export const MAX_WINDOW_MS = Math.max(
  DEFAULT_LIMIT.windowMs,
  ...Object.values(ENDPOINT_LIMITS).map((l) => l.windowMs),
);
