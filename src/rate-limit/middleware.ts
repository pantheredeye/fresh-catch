import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given endpoint using the RateLimitDO.
 * Extracts client IP from CF-Connecting-IP header.
 * Returns the rate limit result after incrementing the counter.
 */
export async function checkRateLimit(endpoint: string): Promise<RateLimitResult> {
  const { request } = requestInfo;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = `${ip}:${endpoint}`;

  const doId = env.RATE_LIMIT_DURABLE_OBJECT.idFromName("global");
  const stub = env.RATE_LIMIT_DURABLE_OBJECT.get(doId);

  return stub.increment(key, endpoint);
}

/**
 * Route middleware factory for rate limiting auth endpoints.
 * Wire into worker.tsx before auth routes.
 * Maps URL paths to rate limit endpoint names.
 */
export function rateLimitAuth() {
  return async ({ request }: { request: Request }) => {
    // Only rate-limit POST (server function calls) and GET to auth pages
    const url = new URL(request.url);
    if (url.pathname !== "/login" && url.pathname !== "/join/invite") return;

    // Use a general "auth" endpoint for page-level limiting
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const key = `${ip}:auth`;

    const doId = env.RATE_LIMIT_DURABLE_OBJECT.idFromName("global");
    const stub = env.RATE_LIMIT_DURABLE_OBJECT.get(doId);

    // Check without incrementing — server functions will increment per-operation
    const result = await stub.check(key, "login");

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
      return new Response("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      });
    }
  };
}
