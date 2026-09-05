interface Limit {
  maxRequests: number;
  windowMs: number;
}

const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * Limits per endpoint. Ported from v1's #26 fix (main, rate-limit/limits.ts).
 *
 * Auth endpoints use TWO buckets (see rate-limit.ts):
 *   - a tight per-identity (email) bucket, which is the real control
 *   - a loose per-IP ceiling named `<endpoint>Ip`, which is only an abuse backstop
 *
 * The IP ceilings are deliberately generous. Login is OTP-email-only, so a bucket
 * that bites shared NAT (market wifi, mobile CGNAT, an office) locks real customers
 * out of the only way in — many people behind one IP is normal, not suspicious.
 */
export const ENDPOINT_LIMITS = {
  otpSend: { maxRequests: 3, windowMs: FIFTEEN_MIN }, // per EMAIL
  otpSendIp: { maxRequests: 100, windowMs: FIFTEEN_MIN }, // per-IP ceiling
  otpVerify: { maxRequests: 10, windowMs: FIFTEEN_MIN }, // per EMAIL
  otpVerifyIp: { maxRequests: 200, windowMs: FIFTEEN_MIN }, // per-IP ceiling
} as const satisfies Record<string, Limit>;

export type RateLimitEndpoint = keyof typeof ENDPOINT_LIMITS;

/**
 * Endpoints that have a matching `<endpoint>Ip` ceiling, and are therefore
 * safe to call with an identity. Passing an identity for an endpoint with no
 * ceiling would be a silent, tight, IP-less bucket — make it a compile error
 * instead (see rate-limit.ts).
 */
export type IdentityEndpoint = {
  [K in RateLimitEndpoint]: `${K}Ip` extends RateLimitEndpoint ? K : never;
}[RateLimitEndpoint];
