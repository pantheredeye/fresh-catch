"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { requireCsrf } from "@/session/csrf";
import { generateApiKey } from "@/utils/api-keys";

export async function createApiKey(csrfToken: string, orgId: string) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || orgId !== ctx.currentOrganization?.id) {
    return { success: false as const, error: "Admin access required" };
  }

  try {
    const { key, hash, prefix } = await generateApiKey();

    await db.organization.update({
      where: { id: orgId },
      data: { apiKeyHash: hash, apiKeyPrefix: prefix },
    });

    return { success: true as const, key, prefix };
  } catch (error) {
    console.error("Failed to generate API key:", error);
    return { success: false as const, error: "Failed to generate API key" };
  }
}
