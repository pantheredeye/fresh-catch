import type { FC } from "hono/jsx";
import type { Vendor } from "@/lib/db";
import { formatPhoneDisplay, telHref } from "@/lib/format";
import { Band } from "@/ui/band";

/** Brand bar — wordmark + tappable phone. Shared across every customer-facing page; login/"My requests" live in the footer instead. */
export const BrandBar: FC<{ vendor: Vendor | null; container?: boolean }> = ({ vendor, container }) => (
  <Band tone="paper" class="bar" container={container}>
    <span class="brand">2 Fishes Seafood</span>
    {vendor?.phone ? <a href={telHref(vendor.phone)}>{formatPhoneDisplay(vendor.phone)}</a> : null}
  </Band>
);
