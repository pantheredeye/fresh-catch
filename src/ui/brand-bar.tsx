import type { FC } from "hono/jsx";
import type { Vendor } from "@/lib/db";
import type { SessionPayload } from "@/features/auth/session";
import { formatPhoneDisplay, telHref } from "@/lib/format";
import { Band } from "@/ui/band";

/** Brand bar — wordmark, "Requests", tappable phone, and Log in / Log out by session. Never links /admin (lives on `/requests`). */
export const BrandBar: FC<{ vendor: Vendor | null; session: SessionPayload | null; container?: boolean }> = ({
  vendor,
  session,
  container,
}) => (
  <Band tone="paper" class="bar" container={container}>
    <span class="brand">2 Fishes Seafood</span>
    <nav aria-label="Account" class="bar-nav">
      <a href="/requests">Requests</a>
      {vendor?.phone ? <a href={telHref(vendor.phone)}>{formatPhoneDisplay(vendor.phone)}</a> : null}
      {session ? (
        <form method="post" action="/logout" class="bar-logout">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <button type="submit" class="bar-link">Log out</button>
        </form>
      ) : (
        <a href="/login">Log in</a>
      )}
    </nav>
  </Band>
);
