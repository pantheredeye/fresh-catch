"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { requireCsrf } from "@/session/csrf";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateAccentColor(
  csrfToken: string,
  orgId: string,
  accentColor: string | null
) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || orgId !== ctx.currentOrganization?.id) {
    return { success: false as const, error: "Admin access required" };
  }

  if (accentColor !== null && !HEX_COLOR_RE.test(accentColor)) {
    return { success: false as const, error: "Invalid hex color format" };
  }

  try {
    await db.organization.update({
      where: { id: orgId },
      data: { accentColor },
    });

    return { success: true as const };
  } catch (error) {
    console.error("Failed to update accent color:", error);
    return { success: false as const, error: "Failed to update accent color" };
  }
}
