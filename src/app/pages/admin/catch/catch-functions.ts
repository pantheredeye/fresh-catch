"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

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
