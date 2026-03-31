import type { AppContext } from "@/worker";

/**
 * Role-based permission utilities
 *
 * Role hierarchy:
 * - owner: Full admin access
 * - manager: Admin access
 * - customer: Customer-only access
 *
 * Features:
 * - Single components handle multiple user types (no duplicate admin/customer pages)
 * - Progressive permissions - Owners can modify markets, Managers can manage schedules
 * - Easy to add new roles or extend permissions
 */

export function hasAdminAccess(ctx: AppContext): boolean {
  return ctx.currentOrganization?.type === 'business' &&
    ['owner', 'manager'].includes(ctx.currentOrganization.role);
}

export function isOwner(ctx: AppContext): boolean {
  return ctx.currentOrganization?.role === 'owner';
}

export function isManager(ctx: AppContext): boolean {
  return ctx.currentOrganization?.role === 'manager';
}

export function isCustomer(ctx: AppContext): boolean {
  return ctx.currentOrganization?.role === 'customer';
}

/**
 * Check if user can access admin routes
 * Used in route protection middleware
 */
export function canAccessAdminRoutes(ctx: AppContext): boolean {
  return hasAdminAccess(ctx);
}

/**
 * Check if user can modify market configuration
 * Currently owner-only, but extensible
 */
export function canModifyMarkets(ctx: AppContext): boolean {
  return ctx.currentOrganization?.type === 'business' && isOwner(ctx);
}

/**
 * Check if user can manage schedules
 * Both owners and managers can handle daily operations
 */
export function canManageSchedules(ctx: AppContext): boolean {
  return hasAdminAccess(ctx);
}

/**
 * Check if user can manage team members and invites
 * Owner-only
 */
export function canManageTeam(ctx: AppContext): boolean {
  return ctx.currentOrganization?.type === 'business' && isOwner(ctx);
}