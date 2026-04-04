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
  const rawMarkets = await db.market.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  // Serialize dates to strings for client component
  const markets = rawMarkets.map((m) => ({
    id: m.id,
    name: m.name,
    schedule: m.schedule,
    subtitle: m.subtitle,
    locationDetails: m.locationDetails,
    customerInfo: m.customerInfo,
    active: m.active,
    type: m.type,
    expiresAt: m.expiresAt?.toISOString() ?? null,
    catchPreview: m.catchPreview,
    cancelledAt: m.cancelledAt?.toISOString() ?? null,
  }));

  return <MarketConfigUI csrfToken={ctx.session!.csrfToken} markets={markets} />;
}