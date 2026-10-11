import type { FC } from "hono/jsx";
import type { Vendor } from "@/lib/db";
import { formatPhoneDisplay, telHref } from "@/lib/format";
import { Band } from "@/ui/band";

/** Brand bar — wordmark, "My requests", tappable phone. Same for everyone: no role-specific links (Admin/Log in live on `/requests`). */
export const BrandBar: FC<{ vendor: Vendor | null; container?: boolean }> = ({ vendor, container }) => (
  <Band tone="paper" class="bar" container={container}>
    <span class="brand">2 Fishes Seafood</span>
    <nav aria-label="Account" class="bar-nav">
      <a href="/requests">My requests</a>
      {vendor?.phone ? <a href={telHref(vendor.phone)}>{formatPhoneDisplay(vendor.phone)}</a> : null}
    </nav>
  </Band>
);
