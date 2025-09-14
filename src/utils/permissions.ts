import type { AppContext } from "@/worker";

/**
 * Role-based permission utilities
 *
 * Role hierarchy:
 * - owner: Full admin access (Evan)
 * - manager: Admin access (future employees)
 * - customer: Customer-only access (buyers)

  What's implemented:
  1. Permission utilities (/src/utils/permissions.ts) with role checking functions
  2. Role hierarchy - Owner → Manager → Customer with granular permissions
  3. Context-aware components - MarketCard example shows conditional UI
  4. Documentation updated in both pattern files

  Key features:
  - Single components handle multiple user types (no duplicate admin/customer pages)
  - Visual role indicators - Coral buttons for admin, Ocean for customers
  - Progressive permissions - Owners can modify markets, Managers can manage schedules
  - Future-proof - Easy to add new roles or extend permissions

  Example in CustomerHome:
  - Customer sees: "Order Fish" (Ocean button) + Directions
  - Admin sees: "Manage Market" (Coral button) + Settings gear + Directions

  Ready for Evan + future managers - The system automatically handles role detection and UI adaptation. When Evan hires managers, they'll get admin
  access to schedules but not market configuration (unless you extend canModifyMarkets function).
  
 */

export function hasAdminAccess(ctx: AppContext): boolean {
  return ['owner', 'manager'].includes(ctx.currentOrganization?.role || '');
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
  return isOwner(ctx); // Could extend to managers later
}

/**
 * Check if user can manage schedules
 * Both owners and managers can handle daily operations
 */
export function canManageSchedules(ctx: AppContext): boolean {
  return hasAdminAccess(ctx);
}