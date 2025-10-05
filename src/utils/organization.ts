/**
 * Organization context utilities
 *
 * Phase 1: Hardcoded for Evan's organization
 * Future: Can be replaced with subdomain detection, route params, or env var
 */

/**
 * Get the public-facing organization ID for customer views
 *
 * Phase 1: Returns hardcoded org ID for Evan
 * Phase 2+: Could detect from:
 * - Subdomain (evan.freshcatch.com)
 * - Route parameter (/business/fresh-catch-seafood)
 * - Environment variable
 */
export function getPublicOrganizationId(): string {
  // TODO: Replace with actual Evan's org ID after seeding
  // For now, this will be set once we know the org ID from the database
  return process.env.PUBLIC_ORG_ID || "fresh-catch-seafood-org-id";
}

/**
 * Get organization name for display
 */
export function getPublicOrganizationName(): string {
  return "Fresh Catch Seafood Markets";
}
