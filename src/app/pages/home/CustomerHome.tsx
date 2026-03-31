import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { getPublicOrganizationId } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";

const STALE_DAYS = 7;

function getQuickActions(vendorSlug?: string) {
  const orderHref = vendorSlug ? `/orders/new?b=${vendorSlug}` : "/orders/new";
  return [
    { icon: "🐟", title: "Quick Order", href: orderHref },
    { icon: "📋", title: "My Orders", href: "/orders" },
    { icon: "📍", title: "Markets", href: "#markets" },
    { icon: "💬", title: "Contact", href: "#text" }
  ];
}

/**
 * CustomerHome - Server Component
 *
 * RWSDK Pattern: Server Component that fetches real data
 * - Uses ctx.browsingOrganization from tenant middleware for ?b= resolution
 * - Falls back to getPublicOrganizationId() when no ?b= param
 * - Passes all data to CustomerHomeUI client component
 */
export async function CustomerHome({ ctx, request }: RequestInfo) {
  let orgId: string;

  if (ctx.browsingOrganization) {
    // Middleware resolved ?b=slug to an org
    orgId = ctx.browsingOrganization.id;
  } else {
    // Check if ?b= param was present but didn't resolve (invalid slug)
    const url = new URL(request.url);
    const businessSlug = url.searchParams.get('b');

    if (businessSlug) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    // No ?b= param: auto-detect single business
    const detectedOrgId = await getPublicOrganizationId();

    if (!detectedOrgId) {
      return <BusinessNotFound businessSlug={null} />;
    }

    orgId = detectedOrgId;
  }

  // Fetch active regular markets
  const markets = await db.market.findMany({
    where: {
      organizationId: orgId,
      active: true,
      type: "regular"
    },
    orderBy: { name: "asc" }
  });

  // Fetch active popups (not cancelled, not expired)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rawPopups = await db.market.findMany({
    where: {
      organizationId: orgId,
      type: "popup",
      active: true,
      cancelledAt: null
    },
    orderBy: { expiresAt: "asc" }
  });

  // Filter: expiresAt is null OR >= start of today, then serialize dates
  const popups = rawPopups
    .filter(p => !p.expiresAt || p.expiresAt >= startOfToday)
    .map(p => ({
      id: p.id,
      name: p.name,
      schedule: p.schedule,
      expiresAt: p.expiresAt?.toISOString() ?? "",
      locationDetails: p.locationDetails,
      customerInfo: p.customerInfo,
      catchPreview: p.catchPreview
    }));

  // Fetch latest live catch update, with staleness check
  const catchUpdate = await db.catchUpdate.findFirst({
    where: { organizationId: orgId, status: "live" },
    orderBy: { createdAt: "desc" },
  });

  const isStale = catchUpdate &&
    (Date.now() - new Date(catchUpdate.createdAt).getTime()) > STALE_DAYS * 86400000;

  const catchData = catchUpdate && !isStale
    ? {
        ...JSON.parse(catchUpdate.formattedContent),
        updatedAt: catchUpdate.createdAt.toISOString(),
      }
    : null;

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