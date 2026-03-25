import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { getPublicOrganizationId } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";

const STALE_DAYS = 7;

const MOCK_QUICK_ACTIONS = [
  { icon: "🐟", title: "Quick Order", href: "/orders/new" },
  { icon: "📋", title: "My Orders", href: "/orders" },
  { icon: "📍", title: "Markets", href: "#markets" },
  { icon: "💬", title: "Contact", href: "#text" }
];

/**
 * CustomerHome - Server Component
 *
 * RWSDK Pattern: Server Component that fetches real data
 * - Supports ?b= query param for multi-tenant (e.g., /?b=evan)
 * - Fetches active markets from database
 * - Falls back to getPublicOrganizationId() if no param
 * - Passes all data to CustomerHomeUI client component
 */
export async function CustomerHome({ ctx, request }: RequestInfo) {
  // Get business slug from query param (e.g., ?b=evan)
  const url = new URL(request.url);
  const businessSlug = url.searchParams.get('b');

  let orgId: string;

  if (businessSlug) {
    // Look up business by slug
    const org = await db.organization.findFirst({
      where: { slug: businessSlug, type: 'business' }
    });

    if (!org) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    orgId = org.id;
  } else {
    // Default: Auto-detect first/only business
    const detectedOrgId = await getPublicOrganizationId();

    if (!detectedOrgId) {
      return <BusinessNotFound businessSlug={null} />;
    }

    orgId = detectedOrgId;
  }

  // Fetch active markets from database
  const markets = await db.market.findMany({
    where: {
      organizationId: orgId,
      active: true
    },
    orderBy: { name: "asc" }
  });

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
      catchData={catchData}
      quickActions={MOCK_QUICK_ACTIONS}
      ctx={ctx}
    />
  );
}