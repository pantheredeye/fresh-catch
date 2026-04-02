"use server";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";

/**
 * Track share events for analytics
 *
 * TODO: Advanced analytics for future:
 * - Conversion tracking (who signed up via share link)
 * - Referral attribution (discount codes for sharers)
 * - Share virality metrics (how many 2nd/3rd degree shares)
 */
export async function trackShare(
  shareType: "link" | "qr" | "facebook" | "twitter" | "whatsapp"
) {
  const { ctx } = requestInfo;

  const orgId = ctx.browsingOrganization?.id ?? ctx.currentOrganization?.id;
  if (!orgId) {
    return { success: false, error: "No organization context" };
  }

  try {
    await db.shareEvent.create({
      data: {
        organizationId: orgId,
        shareType,
        sharedBy: ctx.user?.id || null,
        timestamp: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to track share event:", error);
    return { success: false, error: String(error) };
  }
}
