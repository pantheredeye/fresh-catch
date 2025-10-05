import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { getPublicOrganizationId } from "@/utils/organization";
import { CustomerHomeUI } from "./CustomerHomeUI";

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
 * - Fetches active markets from database
 * - Gets organization ID from utility function
 * - Passes all data to CustomerHomeUI client component
 */
export async function CustomerHome({ ctx }: RequestInfo) {
  const orgId = getPublicOrganizationId();

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