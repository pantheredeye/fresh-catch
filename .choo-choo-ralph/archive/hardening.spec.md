---
title: "Architecture Hardening"
created: 2026-03-20
poured:
  - fresh-catch-sd7j
  - fresh-catch-khd2
  - fresh-catch-c9k0
  - fresh-catch-vw75
iteration: 1
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Architecture Hardening</project_name>

  <overview>
    Full architecture review uncovered security vulnerabilities, schema issues,
    inconsistent patterns, and cleanup opportunities. This epic tracks all
    hardening work prioritized by risk.
  </overview>

  <context>
    <existing_patterns>
      - Permission checks via src/utils/permissions.ts (hasAdminAccess, isOwner, etc.)
      - Admin pages do per-page auth checks: !ctx.user → login, !hasAdminAccess → denied, !ctx.currentOrganization → setup
      - AdminLayout.tsx wraps all /admin/* routes with role check in layout
      - Server functions use "use server" with ctx validation before mutations
      - Session loaded in worker.tsx middleware, populates AppContext with user + currentOrganization
      - Error pages use .error-card CSS pattern but implementations vary per page
    </existing_patterns>
    <integration_points>
      - src/worker.tsx - middleware chain, route definitions, AppContext type
      - src/utils/permissions.ts - all role-checking functions
      - src/app/pages/user/functions.ts - registration/login flows, addMembershipWithJoinCode
      - src/app/pages/admin/team/team-functions.ts - invite accept, team management
      - src/layouts/AdminLayout.tsx + AdminLayoutClient.tsx - admin access gate
      - prisma/schema.prisma - Credential, Market, Organization, Invite models
      - src/design-system/index.ts - barrel exports
    </integration_points>
    <new_technologies>
      - No new tech required; all changes are within existing stack
    </new_technologies>
    <conventions>
      - Page files: FeaturePage.tsx (server) + FeatureUI.tsx (client) + functions.ts
      - Migrations: sequential numbered SQL files in migrations/
      - Permissions: pure functions taking AppContext, returning boolean
      - Design system: primitives only, page compositions in page/components/
    </conventions>
  </context>

  <tasks>
    <task id="fix-role-escalation" priority="0" category="functional">
      <title>Fix role escalation via join codes</title>
      <description>
        addMembershipWithJoinCode in src/app/pages/user/functions.ts allows
        upgrading an existing membership role if a higher-privilege code is used.
        A customer who obtains a manager code can self-promote.
      </description>
      <steps>
        - In addMembershipWithJoinCode, check if user already has membership in target org
        - If existing membership found, reject with error instead of upgrading role
        - Return clear error message: "You already have access to this organization"
      </steps>
      <test_steps>
        1. Create a customer membership for a user
        2. Call addMembershipWithJoinCode with manager code for same org
        3. Verify it rejects (not upgrades)
        4. Verify existing role unchanged
      </test_steps>
      <review></review>
    </task>

    <task id="admin-route-guard" priority="0" category="functional">
      <title>Add admin route interceptor in worker.tsx</title>
      <description>
        Admin protection relies on layout rendering + per-page checks. A route-level
        interceptor before any admin page renders is more robust. Single point of
        enforcement for all /admin/* routes.
      </description>
      <steps>
        - Create adminGuard middleware function that checks hasAdminAccess(ctx)
        - Returns 302 redirect to /login if !ctx.user, or 403 page if no admin access
        - Add as first element in admin route array: prefix("/admin", [adminGuard, ...adminRoutes])
        - Keep existing per-page checks as defense-in-depth (don't remove)
      </steps>
      <test_steps>
        1. Visit /admin/* as unauthenticated user → redirected to /login
        2. Visit /admin/* as customer → 403 access denied
        3. Visit /admin/* as owner/manager → renders normally
      </test_steps>
      <review></review>
    </task>

    <task id="session-role-revalidation" priority="0" category="functional">
      <title>Re-validate session role from DB on each request</title>
      <description>
        Session stores role at login time but never re-validates. If admin is
        demoted, they keep owner permissions until session expires. Already
        loading user+memberships in middleware — just need to use DB role
        instead of session role for ctx.currentOrganization.
      </description>
      <steps>
        - In worker.tsx middleware, after fetching user with memberships, find membership matching session's currentOrganizationId
        - Use membership.role from DB (not session.role) when populating ctx.currentOrganization
        - If membership no longer exists, clear org context and redirect to /
        - Optionally update session.role to match DB for consistency
      </steps>
      <test_steps>
        1. Login as owner, verify admin access
        2. Directly change membership role in DB to "customer"
        3. Refresh page → should lose admin access immediately
        4. Verify ctx.currentOrganization.role reflects DB, not stale session
      </test_steps>
      <review></review>
    </task>

    <task id="org-type-permissions" priority="0" category="functional">
      <title>Add org type check to permission functions</title>
      <description>
        Permission functions in src/utils/permissions.ts don't check
        organization.type === "business". Every user is "owner" of their
        individual org, so canModifyMarkets() returns true for personal orgs.
      </description>
      <steps>
        - Add organization type to AppContext.currentOrganization (already has 'type' field)
        - Update hasAdminAccess, canModifyMarkets, canManageTeam etc. to also require type === "business"
        - Verify login flow still sets type correctly in ctx
        - Update AdminLayout inline check to use hasAdminAccess(ctx) instead of raw string comparison
      </steps>
      <test_steps>
        1. Login as user with only individual org → hasAdminAccess returns false
        2. Login as business owner → hasAdminAccess returns true
        3. Verify all admin pages still work for business owners/managers
        4. Verify customers can't access admin even though they're "owner" of personal org
      </test_steps>
      <review></review>
    </task>

    <task id="fix-credential-unique" priority="1" category="functional">
      <title>Fix Credential @unique on userId</title>
      <description>
        prisma/schema.prisma has @unique on userId in Credential model,
        preventing multiple passkeys per user. WebAuthn spec expects 1-to-many
        (multiple devices). Need migration to drop unique constraint.
      </description>
      <steps>
        - Remove @unique from userId field in Credential model (keep @@index)
        - Create migration: ALTER TABLE Credential — drop unique index on userId
        - Verify existing credential lookups still work (they query by credentialId, not userId)
        - Test registration still works with the change
      </steps>
      <test_steps>
        1. Apply migration
        2. Register a new passkey for existing user (different device/browser)
        3. Verify both credentials work for login
        4. Verify credential counter updates independently per credential
      </test_steps>
      <review></review>
    </task>

    <task id="market-compound-index" priority="1" category="infrastructure">
      <title>Add Market(organizationId, active) compound index</title>
      <description>
        Every customer home page query filters on both organizationId and active.
        Currently separate indexes. Compound index improves query performance.
      </description>
      <steps>
        - Add @@index([organizationId, active]) to Market model in schema.prisma
        - Create migration with CREATE INDEX
        - Can keep individual indexes as they serve other queries
      </steps>
      <test_steps>
        1. Apply migration
        2. Verify customer home page loads markets correctly
        3. Verify admin market config still works
      </test_steps>
      <review></review>
    </task>

    <task id="standardize-error-pages" priority="1" category="functional">
      <title>Standardize error/access-denied pages</title>
      <description>
        Admin pages use 4 different patterns when auth fails: inline Login
        component, styled error div, dedicated error component, access denied
        card. Should have one reusable pattern.
      </description>
      <steps>
        - Create shared AccessDenied and NotAuthenticated components in src/app/pages/admin/components/
        - Standardize on error-card CSS pattern already in admin.css
        - Replace all inline error handling in admin pages with shared components
        - Keep consistent icon, title, description, and action link pattern
      </steps>
      <test_steps>
        1. Visit each admin page as unauthenticated → same error UI
        2. Visit each admin page as customer → same access denied UI
        3. Verify error pages have correct back links and actions
      </test_steps>
      <review></review>
    </task>

    <task id="order-state-machine" priority="1" category="functional">
      <title>Document and validate order pricing state machine</title>
      <description>
        Order model has many nullable fields (price, totalDue, depositAmount,
        paymentMethod). State transitions are implicit. Risk of invalid states.
        Need documentation and validation.
      </description>
      <steps>
        - Document expected order lifecycle states and valid field combinations
        - Add validation in server functions that create/update orders
        - Ensure getPaymentStatus() utility covers all valid states
        - Add comments to schema.prisma documenting field semantics
      </steps>
      <test_steps>
        1. Create order → verify required fields populated
        2. Process payment → verify state transition is valid
        3. Attempt invalid state (e.g., paid without price) → verify rejection
      </test_steps>
      <review></review>
    </task>

    <task id="optimize-user-loading" priority="2" category="functional">
      <title>Optimize user loading in middleware</title>
      <description>
        worker.tsx loads user with ALL memberships + organizations on every
        request. Most requests only need current org's membership.
      </description>
      <steps>
        - Change include to only fetch membership matching session's currentOrganizationId
        - Fall back to all memberships only when org context is missing (first login)
        - Verify all pages that need user.memberships still work (check usage)
      </steps>
      <test_steps>
        1. Login and navigate all pages → everything still works
        2. Verify org switching (if implemented) still works
        3. Check that first-login auto-org-selection still works
      </test_steps>
      <review></review>
    </task>

    <task id="filter-deleted-users" priority="2" category="functional">
      <title>Filter soft-deleted users from order queries</title>
      <description>
        Soft-deleted users' orders still appear in admin order views.
        Queries don't filter by user.deletedAt.
      </description>
      <steps>
        - Audit all order queries in admin pages
        - Add where clause or post-filter for user.deletedAt IS NULL
        - Consider Prisma middleware for global soft-delete filtering
      </steps>
      <test_steps>
        1. Soft-delete a user with orders
        2. View admin orders page → deleted user's orders should be hidden or marked
        3. Verify customer-facing order history handles this correctly
      </test_steps>
      <review></review>
    </task>

    <task id="validate-invite-email" priority="2" category="functional">
      <title>Validate invite email on accept</title>
      <description>
        Anyone with an invite link can accept regardless of whether their
        email matches invite.email. Should at minimum warn, or enforce match.
      </description>
      <steps>
        - In acceptInvite() in team-functions.ts, compare ctx.user.email with invite.email
        - If mismatch, either reject or warn (decide on UX)
        - Add invite.email display to AcceptInvitePage so user can see who it was meant for
      </steps>
      <test_steps>
        1. Create invite for user@example.com
        2. Login as different@example.com, try to accept → verify behavior
        3. Login as user@example.com, accept → should succeed
      </test_steps>
      <review></review>
    </task>

    <task id="consistent-permission-usage" priority="2" category="functional">
      <title>Use hasAdminAccess(ctx) consistently</title>
      <description>
        AdminLayout.tsx uses raw string comparison ['owner', 'manager'].includes()
        instead of hasAdminAccess(ctx). Should use the utility everywhere.
      </description>
      <steps>
        - Replace inline role check in AdminLayout.tsx with hasAdminAccess(ctx)
        - Audit AdminLayoutClient.tsx for similar inline checks
        - Search codebase for other raw role string comparisons
      </steps>
      <test_steps>
        1. Verify admin layout still grants/denies access correctly
        2. Verify no behavioral change
      </test_steps>
      <review></review>
    </task>

    <task id="cleanup-design-system" priority="3" category="infrastructure">
      <title>Remove unused design system exports</title>
      <description>
        LoginForm, QRCodeGenerator, ShareButton, DateHeader are exported from
        design system but never imported anywhere.
      </description>
      <steps>
        - Verify each component has zero imports outside design-system
        - Remove from index.ts barrel export
        - Optionally delete component files if truly unused
        - Keep if planned for near-term use (check with team)
      </steps>
      <test_steps>
        1. Run pnpm run types → no errors
        2. Run pnpm run build → no errors
        3. Verify design-test page still works
      </test_steps>
      <review></review>
    </task>

    <task id="extract-inline-styles" priority="3" category="style">
      <title>Extract repeated inline style patterns into utility classes</title>
      <description>
        Page components have 37+ occurrences of inline style={{}} with repeated
        flex/gap/padding combinations. Common patterns could be utility classes.
      </description>
      <steps>
        - Audit most common inline style patterns (flex containers, gap combos)
        - Add utility classes to tokens.css for top 5-10 patterns
        - Replace inline styles in page components
        - Keep one-off styles inline (don't over-extract)
      </steps>
      <test_steps>
        1. Visual comparison before/after on all affected pages
        2. Verify no layout regressions
        3. Check dark mode still works
      </test_steps>
      <review></review>
    </task>

    <task id="enum-constraints" priority="3" category="infrastructure">
      <title>Add enum/CHECK constraints for status fields</title>
      <description>
        Organization.type and Invite.status are free-form strings with no
        DB-level validation. Could store invalid values.
      </description>
      <steps>
        - Add CHECK constraints in migration for Organization.type IN ('individual', 'business')
        - Add CHECK constraint for Invite.status IN ('pending', 'accepted', 'revoked')
        - Add CHECK constraint for Membership.role IN ('owner', 'manager', 'customer')
        - Test that existing data passes constraints before applying
      </steps>
      <test_steps>
        1. Apply migration
        2. Verify existing data is valid
        3. Attempt to insert invalid type/status → verify rejection
        4. Verify all create/update operations still work
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - No role escalation vulnerabilities
    - Single point of admin route enforcement
    - Session role always reflects DB state
    - Permission functions org-type-aware
    - Multiple passkeys per user supported
    - Consistent error handling across admin pages
    - Clean design system exports (no dead code)
    - All status fields DB-validated
  </success_criteria>
</project_specification>
