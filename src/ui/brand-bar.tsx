import type { FC } from "hono/jsx";
import type { Vendor } from "@/lib/db";
import { formatPhoneDisplay, telHref } from "@/lib/format";
import { Band } from "@/ui/band";

/** Brand bar — wordmark + tappable phone. Shared across every customer-facing page; login/"My requests" live in the footer instead. */
export const BrandBar: FC<{ vendor: Vendor | null }> = ({ vendor }) => (
  <Band tone="paper" class="bar">
    <span class="brand">Fresh Catch</span>
    {vendor?.phone ? <a href={telHref(vendor.phone)}>{formatPhoneDisplay(vendor.phone)}</a> : null}
  </Band>
);
