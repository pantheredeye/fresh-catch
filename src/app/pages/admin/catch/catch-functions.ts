"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

interface CatchContent {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
}

export async function publishCatch(content: CatchContent, rawTranscript: string) {
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

  return { success: true };
}

export async function clearCatch() {
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

  return { success: true };
}
