import type { FC } from "hono/jsx";
import type { SessionPayload } from "@/features/auth/session";
import { Button } from "@/ui/button";

/** Rendered above `<main>` on every customer-facing HTML route — the one nav a customer page has. */
export const SiteNav: FC<{ session: SessionPayload | null }> = ({ session }) => (
  <nav aria-label="Site" class="cluster justify-end">
    {session ? (
      <>
        <span class="muted">
          {session.email}
          {session.isAdmin ? " (admin)" : ""}
        </span>
        <form method="post" action="/logout">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <Button type="submit" variant="ghost" inline>
            Log out
          </Button>
        </form>
        {session.isAdmin ? <a href="/admin">Admin</a> : null}
      </>
    ) : (
      <a href="/login">Log in</a>
    )}
    <a href="/requests">My requests</a>
  </nav>
);
