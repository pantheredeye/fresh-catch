import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { MarketConfigUI } from "./MarketConfigUI";

/**
 * MarketConfigPage - Server component for admin market configuration
 *
 * RWSDK Pattern: Server Component + Server Functions
 * - Fetches market data directly in server component
 * - Passes data as props to client component (MarketConfigUI)
 * - Client component calls server functions for mutations
 *
 * This allows Evan to configure his markets for the 2-week rotation schedule.
 */
export async function MarketConfigPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.currentOrganization) {
    return <div>No organization context</div>;
  }

  // Fetch markets directly in server component
  const markets = await db.market.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return <MarketConfigUI markets={markets} />;
}