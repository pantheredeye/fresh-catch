import { RequestInfo } from "rwsdk/worker";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";
import { fetchVendorData, getQuickActions } from "./fetchVendorData";

/**
 * VendorProfilePage - Server Component for /v/:slug routes
 *
 * Reads ctx.browsingOrganization (resolved by tenant middleware).
 * If null (invalid slug), shows not-found. Otherwise fetches vendor
 * data and renders CustomerHomeUI.
 */
export async function VendorProfilePage({ ctx, request }: RequestInfo) {
  if (!ctx.browsingOrganization) {
    const url = new URL(request.url);
    const slug = url.pathname.match(/^\/v\/([^/]+)/)?.[1] ?? null;
    return <BusinessNotFound businessSlug={slug} />;
  }

  const { markets, popups, catchData } = await fetchVendorData(ctx.browsingOrganization.id);

  return (
    <CustomerHomeUI
      markets={markets}
      popups={popups}
      catchData={catchData}
      quickActions={getQuickActions(ctx.browsingOrganization.slug)}
      ctx={ctx}
    />
  );
}
