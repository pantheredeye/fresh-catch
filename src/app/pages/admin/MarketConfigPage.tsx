import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { MarketConfigUI } from "./MarketConfigUI";
import { NotAuthenticated, AccessDenied, NoOrganization } from "./components";

export async function MarketConfigPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  // Fetch markets directly in server component
  const markets = await db.market.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return <MarketConfigUI markets={markets} />;
}