import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Bindings, Variables } from "@/types";
import { requireSecret } from "@/lib/env";
import { parseSessionValue, SESSION_COOKIE_NAME } from "./session";

const DEVICE_COOKIE_NAME = "device";
const DEVICE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Anonymous device-token cookie. Every visitor gets a stable, unauthenticated
 * identifier — no browse-wall, nothing is gated on having one. It exists so
 * later features (e.g. attributing a fish request to a return visitor) don't
 * need to invent identity plumbing from scratch.
 */
export function deviceTokenMiddleware(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    let token = getCookie(c, DEVICE_COOKIE_NAME);
    if (!token) {
      token = crypto.randomUUID();
      setCookie(c, DEVICE_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        secure: !import.meta.env.DEV,
        sameSite: "Lax",
        maxAge: DEVICE_MAX_AGE_SECONDS,
      });
    }
    c.set("deviceToken", token);
    await next();
  };
}

/** Parses the signed session cookie (if any) into `c.var.session`. Never blocks a request. */
export function sessionMiddleware(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    const raw = getCookie(c, SESSION_COOKIE_NAME);
    const secret = requireSecret(c.env, "SESSION_SECRET");
    const session = await parseSessionValue(raw, secret);
    c.set("session", session);
    await next();
  };
}

/**
 * Gate for admin-only routes. Single choke point by design: a future
 * teams/multi-org upgrade is "add a role check in here," not a new
 * middleware layered on every admin route. Do not build multi-tenant now —
 * see CLAUDE.md "Removed in the rebuild."
 */
export function requireAdmin(): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const session = c.var.session;
    if (!session?.isAdmin) {
      return c.text("Forbidden", 403);
    }
    await next();
  };
}
