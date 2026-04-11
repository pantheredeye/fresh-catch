import { env } from "cloudflare:workers";
import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { NotAuthenticated, AccessDenied, NoOrganization } from "../components";
import { InsightsUI } from "./InsightsUI";

export async function InsightsPage({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const orgId = ctx.currentOrganization.id;
  const stub = env.SIGNAL_DURABLE_OBJECT.get(
    env.SIGNAL_DURABLE_OBJECT.idFromName(orgId),
  );

  const [insights, topEntities, stats] = await Promise.all([
    stub.getInsights({ limit: 50 }),
    stub.getTopEntities({ days: 7, limit: 15 }),
    stub.getSignalStats({ days: 7 }),
  ]);

  return (
    <InsightsUI
      initialInsights={insights}
      initialEntities={topEntities}
      initialStats={stats}
    />
  );
}
