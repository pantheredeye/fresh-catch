import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { getPublicOrganizationId } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";
import { BusinessNotFound } from "../BusinessNotFound";

// Mock data for sections not yet converted to real data
const MOCK_FRESH_CATCH = [
  { emoji: "🦐", name: "Shrimp" },
  { emoji: "🐟", name: "Redfish" },
  { emoji: "🐠", name: "Flounder" },
  { emoji: "🦀", name: "Crab" },
  { emoji: "🦪", name: "Oysters" },
  { emoji: "🐟", name: "Trout" }
];

const MOCK_QUICK_ACTIONS = [
  { icon: "📅", title: "All Markets", href: "#markets" },
  { icon: "🍳", title: "Recipes", href: "#recipes" },
  { icon: "💬", title: "Text Evan", href: "#text" },
  { icon: "📞", title: "Call", href: "#call" }
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

  return (
    <CustomerHomeUI
      markets={markets}
      freshCatch={MOCK_FRESH_CATCH}
      quickActions={MOCK_QUICK_ACTIONS}
      ctx={ctx}
    />
  );
}