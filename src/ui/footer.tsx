import type { FC } from "hono/jsx";
import type { Vendor } from "@/lib/db";
import type { SessionPayload } from "@/features/auth/session";
import { Button } from "@/ui/button";

/**
 * Footer — © Digital Glue line + login/"My requests"/Admin. Shared across every
 * customer-facing page, per handoff §3's "login lives in the footer"
 * content rule. `note` carries page-specific copy.
 */
export const Footer: FC<{
  vendor: Vendor | null;
  session: SessionPayload | null;
  note?: string;
  container?: boolean;
}> = ({ vendor, session, note, container }) => (
  <footer>
    <div class={container ? "container stack-tight" : "wrap stack-tight"}>
      <p>
        © {new Date().getFullYear()} <a href="https://www.digitalglue.dev">Digital Glue</a>
      </p>
      {note ? <p>{note}</p> : null}
      <p class="cluster">
        {session ? (
          <>
            <a href="/requests">My requests</a>
            {session.isAdmin ? <a href="/admin">Admin</a> : null}
            <form method="post" action="/logout">
              <input type="hidden" name="csrfToken" value={session.csrfToken} />
              <Button type="submit" variant="ghost" inline>
                Log out
              </Button>
            </form>
          </>
        ) : (
          <a href="/login">Log in to see your requests</a>
        )}
      </p>
    </div>
  </footer>
);
