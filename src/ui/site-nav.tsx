import type { FC } from "hono/jsx";
import type { SessionPayload } from "@/features/auth/session";

/** Rendered above `<main>` on every customer-facing HTML route — the one nav a customer page has. */
export const SiteNav: FC<{ session: SessionPayload | null }> = ({ session }) => (
  <nav aria-label="Site" style="display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
    {session ? (
      <>
        <span class="field-helper">
          {session.email}
          {session.isAdmin ? " (admin)" : ""}
        </span>
        <form method="post" action="/logout" style="display: inline">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <button type="submit" class="btn btn-ghost">
            Log out
          </button>
        </form>
        {session.isAdmin ? <a href="/admin">Admin</a> : null}
      </>
    ) : (
      <a href="/login">Log in</a>
    )}
    <a href="/requests">My requests</a>
  </nav>
);
