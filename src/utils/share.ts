"use server";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";

export type ShareType = "organization" | "market";

export interface ShareOptions {
  type: ShareType;
  organizationSlug: string;
  marketId?: string;
}

/**
 * Generate shareable URL - flexible for current subdomain or future multi-tenant
 */
export function generateShareUrl(options: ShareOptions): string {
  const { type, organizationSlug, marketId } = options;

  // Current: subdomain model (evan.digitalglue.dev)
  // Future: switch to ?b=slug by changing this logic
  const baseUrl = `https://${organizationSlug}.digitalglue.dev`;

  if (type === "market" && marketId) {
    return `${baseUrl}/#market-${marketId}`;
  }

  return baseUrl;
}

/**
 * Get current organization share URL from context
 */
export async function getCurrentOrgShareUrl(): Promise<string> {
  // TODO: Fix organization slug in database (should be "evan", not UUID)
  // For now, hardcoded to match deployment subdomain
  return generateShareUrl({
    type: "organization",
    organizationSlug: "evan",
  });
}

/**
 * Generate social media share URLs
 */
export function generateSocialUrls(shareUrl: string, message: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedMessage = encodeURIComponent(message);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`,
    whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,
  };
}
