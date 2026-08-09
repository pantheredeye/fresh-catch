"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { requireCsrf } from "@/session/csrf";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateNotificationEmail(
  csrfToken: string,
  orgId: string,
  notificationEmail: string | null
) {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || orgId !== ctx.currentOrganization?.id) {
    return { success: false as const, error: "Admin access required" };
  }

  const trimmed = notificationEmail?.trim() || null;

  if (trimmed !== null && (trimmed.length > 254 || !EMAIL_RE.test(trimmed))) {
    return { success: false as const, error: "Invalid email address" };
  }

  try {
    await db.organization.update({
      where: { id: orgId },
      data: { notificationEmail: trimmed },
    });

    return { success: true as const };
  } catch (error) {
    console.error("Failed to update notification email:", error);
    return { success: false as const, error: "Failed to update notification email" };
  }
}
