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
 * - If 0 businesses exist: return null (will show "no businesses" page)
 * - If multiple businesses: return first one (TODO: show directory in future)
 */
export async function getPublicOrganizationId(): Promise<string | null> {
  const businesses = await db.organization.findMany({
    where: { type: 'business' },
    orderBy: { createdAt: 'asc' }
  });

  if (businesses.length === 0) {
    return null;
  }

  // For now, return the first business (usually Evan's)
  // Future: This could show a directory page if multiple businesses exist
  return businesses[0].id;
}

/**
 * Get organization name for display
 */
export function getPublicOrganizationName(): string {
  return "Fresh Catch Seafood Markets";
}
