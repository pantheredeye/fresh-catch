import { RequestInfo } from "rwsdk/worker";
import { getPublicOrganization, getPublicOrganizations } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";
import { VendorDirectory } from "./components";
import { fetchVendorData, getQuickActions } from "./fetchVendorData";

/**
 * CustomerHome - Server Component
 *
 * RWSDK Pattern: Server Component that fetches real data
 * - Uses ctx.browsingOrganization from tenant middleware for ?b= resolution
 * - Falls back to getPublicOrganization() when no ?b= param
 * - Shows VendorDirectory when multiple businesses exist, BusinessNotFound when zero
 * - Passes all data to CustomerHomeUI client component
 */
export async function CustomerHome({ ctx, request }: RequestInfo) {
  let orgId: string;
  let vendorSlug: string | undefined;
  let vendorName: string | undefined;

  if (ctx.browsingOrganization) {
    // Middleware resolved ?b=slug to an org
    orgId = ctx.browsingOrganization.id;
    vendorSlug = ctx.browsingOrganization.slug;
    vendorName = ctx.browsingOrganization.name;
  } else {
    // Check if slug was present but didn't resolve (invalid slug)
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/v\/([^/]+)/);
    const businessSlug = pathMatch?.[1] ?? url.searchParams.get('b');

    if (businessSlug) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    // No ?b= param: auto-detect single business
    const detected = await getPublicOrganization();

    if (!detected) {
      // Multiple businesses or none — show directory if any exist
      const vendors = await getPublicOrganizations();
      if (vendors.length > 0) {
        return <VendorDirectory vendors={vendors} />;
      }
      return <BusinessNotFound businessSlug={null} />;
    }

    // Single vendor — redirect to their profile URL
    return new Response(null, {
      status: 302,
      headers: { Location: `/v/${detected.slug}` },
    });
  }

  const { markets, popups, catchData } = await fetchVendorData(orgId);

  // Determine market name: first active regular market, fallback to org name
  const marketName = markets[0]?.name ?? vendorName;

  return (
    <CustomerHomeUI
      markets={markets}
      popups={popups}
      catchData={catchData}
      quickActions={getQuickActions(vendorSlug)}
      marketName={marketName}
      ctx={ctx}
    />
  );
}