"use server";

import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { requireCsrf } from "@/session/csrf";

/** Invalidate AI response cache when catch data changes */
function invalidateResponseCache(organizationId: string): void {
  try {
    const doId = env.MCP_DURABLE_OBJECT.idFromName(organizationId);
    const stub = env.MCP_DURABLE_OBJECT.get(doId);
    stub.invalidateResponseCache();
  } catch (err) {
    console.error("[catch-functions] Failed to invalidate cache:", err);
  }
}

interface CatchContent {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
}

export async function publishCatch(csrfToken: string, content: CatchContent, rawTranscript: string) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    return { success: false, error: "Admin access required" };
  }

  const organizationId = ctx.currentOrganization.id;

  await db.catchUpdate.updateMany({
    where: { organizationId, status: "live" },
    data: { status: "archived" },
  });

  await db.catchUpdate.create({
    data: {
      organizationId,
      recordedBy: ctx.user?.id,
      rawTranscript,
      formattedContent: JSON.stringify(content),
      status: "live",
    },
  });

  invalidateResponseCache(organizationId);

  return { success: true };
}

export async function clearCatch(csrfToken: string) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    return { success: false, error: "Admin access required" };
  }

  await db.catchUpdate.updateMany({
    where: {
      organizationId: ctx.currentOrganization.id,
      status: "live",
    },
    data: { status: "archived" },
  });

  invalidateResponseCache(ctx.currentOrganization.id);

  return { success: true };
}
