/**
 * Organization context utilities
 *
 * Automatically detects which business to show on customer-facing pages
 */

import { db } from "@/db";

/**
 * Get the public-facing organization ID for customer views
 *
 * Logic:
 * - If exactly 1 business exists: return its ID
 * - If 0 or multiple businesses: return null (caller shows directory or not-found)
 */
export async function getPublicOrganizationId(): Promise<string | null> {
  const businesses = await db.organization.findMany({
    where: { type: 'business' },
    select: { id: true },
  });

  if (businesses.length !== 1) {
    return null;
  }

  return businesses[0].id;
}
