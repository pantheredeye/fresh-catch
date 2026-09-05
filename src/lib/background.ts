import type { Context } from "hono";

/**
 * Fire-and-forget outside the request/response cycle — registers `task` with
 * `c.executionCtx.waitUntil()` so the Workers runtime keeps the isolate alive
 * until it settles, without making the caller await it (a Resend outage must
 * never fail the triggering POST). `c.executionCtx` throws when there's no
 * ExecutionContext on this request (e.g. `app.request()` calls in tests that
 * don't pass one) — `task` has already started running regardless, so that
 * case is a no-op registration, not a lost task.
 */
export function runInBackground(c: Context, task: Promise<unknown>): void {
  const guarded = task.catch((err) => console.error("[background] task failed:", err));
  try {
    c.executionCtx.waitUntil(guarded);
  } catch {
    // no ExecutionContext available on this context
  }
}
