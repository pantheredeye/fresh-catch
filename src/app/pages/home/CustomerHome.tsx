import { RequestInfo } from "rwsdk/worker";
import { getPublicOrganizationId, getPublicOrganizations } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";
import { VendorDirectory } from "./components";
import { fetchVendorData, getQuickActions } from "./fetchVendorData";

/**
 * CustomerHome - Server Component
 *
 * RWSDK Pattern: Server Component that fetches real data
 * - Uses ctx.browsingOrganization from tenant middleware for ?b= resolution
 * - Falls back to getPublicOrganizationId() when no ?b= param
 * - Shows VendorDirectory when multiple businesses exist, BusinessNotFound when zero
 * - Passes all data to CustomerHomeUI client component
 */
export async function CustomerHome({ ctx, request }: RequestInfo) {
  let orgId: string;

  if (ctx.browsingOrganization) {
    // Middleware resolved ?b=slug to an org
    orgId = ctx.browsingOrganization.id;
  } else {
    // Check if slug was present but didn't resolve (invalid slug)
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/v\/([^/]+)/);
    const businessSlug = pathMatch?.[1] ?? url.searchParams.get('b');

    if (businessSlug) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    // No ?b= param: auto-detect single business
    const detectedOrgId = await getPublicOrganizationId();

    if (!detectedOrgId) {
      // Multiple businesses or none — show directory if any exist
      const vendors = await getPublicOrganizations();
      if (vendors.length > 0) {
        return <VendorDirectory vendors={vendors} />;
      }
      return <BusinessNotFound businessSlug={null} />;
    }

    orgId = detectedOrgId;
  }

  const { markets, popups, catchData } = await fetchVendorData(orgId);

  return (
    <CustomerHomeUI
      markets={markets}
      popups={popups}
      catchData={catchData}
      quickActions={getQuickActions(ctx.browsingOrganization?.slug)}
      ctx={ctx}
    />
  );
}