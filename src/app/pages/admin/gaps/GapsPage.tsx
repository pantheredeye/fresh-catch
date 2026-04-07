import { env } from "cloudflare:workers";
import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { NotAuthenticated, AccessDenied, NoOrganization } from "../components";
import { GapsUI } from "./GapsUI";

export async function GapsPage({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const orgId = ctx.currentOrganization.id;
  const doId = env.MCP_DURABLE_OBJECT.idFromName(orgId);
  const stub = env.MCP_DURABLE_OBJECT.get(doId);
  const gaps = await stub.getGaps(200);

  return <GapsUI initialGaps={gaps} />;
}
