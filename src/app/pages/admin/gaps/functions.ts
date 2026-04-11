"use server";

import { env } from "cloudflare:workers";
import { requestInfo, serverQuery } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import type { GapLogRow } from "@/mcp/durableObject";

export const getGapLog = serverQuery(async (): Promise<GapLogRow[]> => {
  const { ctx } = requestInfo;
  if (!ctx.user || !hasAdminAccess(ctx) || !ctx.currentOrganization) {
    return [];
  }

  const orgId = ctx.currentOrganization.id;
  const doId = env.MCP_DURABLE_OBJECT.idFromName(orgId);
  const stub = env.MCP_DURABLE_OBJECT.get(doId);
  return stub.getGaps(200);
});
