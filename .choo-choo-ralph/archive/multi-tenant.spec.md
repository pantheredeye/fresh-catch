---
title: "Multi-Tenant Surgical Fixes"
created: 2026-03-29
poured:
  - fresh-catch-mol-q0n0
  - fresh-catch-mol-ztso
  - fresh-catch-mol-jzqr
  - fresh-catch-mol-sr7m
  - fresh-catch-mol-qpwr
  - fresh-catch-mol-ww8l
  - fresh-catch-mol-2aj6
  - fresh-catch-mol-71bg
  - fresh-catch-mol-pd2e
  - fresh-catch-mol-y93k
  - fresh-catch-mol-f8v3
  - fresh-catch-mol-d1ww
  - fresh-catch-mol-uwyz
  - fresh-catch-mol-mnrw
  - fresh-catch-mol-xcy1
  - fresh-catch-mol-4zzx
  - fresh-catch-mol-grs7
  - fresh-catch-mol-bcg8
  - fresh-catch-mol-ik5c
  - fresh-catch-mol-yowz
  - fresh-catch-mol-6okb
  - fresh-catch-mol-hhmu
  - fresh-catch-mol-3aob
  - fresh-catch-mol-pwmg
  - fresh-catch-mol-5bum
  - fresh-catch-mol-4sl8
  - fresh-catch-mol-nwij
  - fresh-catch-mol-7dka
  - fresh-catch-mol-09m4
  - fresh-catch-mol-jbqe
  - fresh-catch-mol-bl9o
  - fresh-catch-mol-zioy
  - fresh-catch-mol-ud81
  - fresh-catch-mol-ljfh
  - fresh-catch-mol-c47v
  - fresh-catch-mol-vb4a
  - fresh-catch-mol-it4i
  - fresh-catch-mol-4pv3
  - fresh-catch-mol-tdin
  - fresh-catch-mol-a720
  - fresh-catch-mol-n4ad
  - fresh-catch-mol-1elo
  - fresh-catch-mol-mkkj
  - fresh-catch-mol-4976
  - fresh-catch-mol-ifz7
  - fresh-catch-mol-g9w0
  - fresh-catch-mol-7oe9
  - fresh-catch-mol-5cfy
  - fresh-catch-mol-zhez
  - fresh-catch-mol-5c2k
  - fresh-catch-mol-62vj
  - fresh-catch-mol-t9do
  - fresh-catch-mol-pyg7
  - fresh-catch-mol-tfbe
  - fresh-catch-mol-3ipe
  - fresh-catch-mol-s2nq
  - fresh-catch-mol-9coe
  - fresh-catch-mol-2mbh
  - fresh-catch-mol-bodl
  - fresh-catch-mol-siw4
  - fresh-catch-mol-qn5z
  - fresh-catch-mol-v3ax
  - fresh-catch-mol-sabg
  - fresh-catch-mol-mnz3
  - fresh-catch-mol-oatb
  - fresh-catch-mol-9waj
  - fresh-catch-mol-zru9
  - fresh-catch-mol-a4r1
  - fresh-catch-mol-hah2
  - fresh-catch-mol-9s83
  - fresh-catch-mol-v9pk
  - fresh-catch-mol-b6op
  - fresh-catch-mol-hh7g
  - fresh-catch-mol-3206
  - fresh-catch-mol-9i2j
  - fresh-catch-mol-5q9n
  - fresh-catch-mol-pc82
  - fresh-catch-mol-j3cj
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Multi-Tenant Surgical Fixes</project_name>

  <overview>
    Fresh Catch's data layer is already multi-tenant — all queries org-scoped, Stripe Connect per-org, order numbering per-org. But hardcoded "Fresh Catch" / "Evan" references assume one vendor, a security audit found real IDOR gaps, and tenant resolution is scattered across pages instead of centralized in middleware.

    Goal: harden tenant isolation, centralize tenant resolution, remove hardcoded references, then enable multi-vendor browsing + org switching.

    Two PRs:
    - PR1 (bbb-multi-tenant): Security fixes + tenant middleware + hardcoded removals + registration fix. A second vendor can sign up and operate in complete isolation.
    - PR2 (bbb-org-free-browsing): /v/{slug} routes, cross-vendor orders, org switcher. Customers browse freely across vendors.
  </overview>

  <context>
    <existing_patterns>
      - RWSDK middleware: `defineApp([...middlewares])` executes sequentially; each middleware receives `RequestInfo` with `ctx`, `request`, `response`; middleware mutates `ctx` and downstream sees changes; returning `Response` short-circuits the chain
      - Middleware extraction: `setCommonHeaders()` in `src/app/headers.ts` returns a `RouteMiddleware` function — follow same pattern for new middleware
      - Route interruptors: middleware in route arrays `route("/path", [guard, handler])` run per-route, not globally
      - Org-scoped server functions use `assertOwner()` pattern from `team-functions.ts:8-14`
      - Session save: `sessions.save(response.headers, { userId, currentOrganizationId, role })`
      - URL org resolution: `url.searchParams.get('b')` → `db.organization.findFirst({ where: { slug, type: 'business' } })` in `CustomerHome.tsx:27-42` — currently duplicated per page
      - Invite system (`team-functions.ts`) is fully org-scoped, token-based, 7-day expiry, auto session switch on accept — production-ready replacement for join codes
    </existing_patterns>
    <integration_points>
      - `src/worker.tsx` — AppContext type (lines 38-46), session middleware (lines 57-159), route definitions. AppContext.currentOrganization currently has `{ id, name, type, role }` but NO `slug` field — needs adding.
      - `src/app/pages/user/functions.ts` — 3 registration functions + 2 login functions with hardcoded "Fresh Catch" lookups
      - `src/app/pages/user/routes.ts` — `/join` route to remove, `/join/invite` to keep
      - `src/app/pages/user/JoinPage.tsx` + `JoinUI.tsx` — files to delete
      - `src/components/Header.tsx` — 3 instances of "Evan's Fresh Catch" (lines 29, 44, 62), `currentOrganization` prop exists
      - `src/utils/organization.ts` — `getPublicOrganizationId()` to update, dead `getPublicOrganizationName()` to delete
      - `src/utils/share.ts` — `getCurrentOrgShareUrl()` hardcodes slug "evan" (line 38), `generateShareUrl()` uses subdomain model. Called from `AdminDashboardUI.tsx:43` and `BottomNavigation.v2.tsx` as server functions via useEffect.
      - `src/app/pages/home/components/LiveBanner.tsx` — hardcodes "LIVE at Livingston Market" (line 31)
      - `src/app/pages/home/CustomerHome.tsx` — per-page org resolution, needs to use middleware context instead
      - `src/app/pages/markets/PastPopupsPage.tsx` — also does per-page org resolution
      - `src/app/pages/orders/functions.ts` — customer order queries use `findUnique({where: {id}})` without orgId verification (IDOR risk). 10+ links to `/orders/new` across codebase with no vendor context param.
      - `src/api/stripe-webhook.ts` — order lookups by ID without org verification (lines 127, 175, 238, 265, 327, 352). Org lookup only by stripeAccountId (line 373).
      - `src/app/pages/admin/Setup.tsx` — hardcoded defaults (lines 57-59)
      - `prisma/schema.prisma` — Membership model lacks `updatedAt`
      - `src/utils/permissions.ts:7` — comment references "(Evan)" — cosmetic
    </integration_points>
    <new_technologies>
      - No new technologies. All changes use existing RWSDK middleware patterns, Prisma, and session Durable Objects.
    </new_technologies>
    <conventions>
      - RWSDK middleware: extract to separate file, return `RouteMiddleware` function, add to `defineApp` array in worker.tsx
      - Server components: `async function Name({ ctx, request }: RequestInfo)` with direct DB fetching
      - Client components: `"use client"` + `useTransition` for server function calls
      - Server functions: `"use server"` in functions.ts, access context via `requestInfo`
      - Page components: `src/app/pages/[feature]/components/` subfolder with barrel export
      - Design tokens: `var(--color-*)`, `var(--space-*)`. Never hardcode hex.
      - Branch naming: `bbb-<descriptive-name>`
    </conventions>
  </context>

  <tasks>
    <!-- ==================== PR1: bbb-multi-tenant ==================== -->

    <task id="security-order-scoping" priority="0" category="functional">
      <title>Fix order IDOR: add orgId verification to customer order queries</title>
      <description>
        Security audit finding. Customer order functions use `db.order.findUnique({where: {id}})` without verifying the order belongs to the expected org. An attacker who guesses an orderId could interact with orders from other vendors.

        Affected functions in `src/app/pages/orders/functions.ts`:
        - `updateOrder()` (:151) — fetches by id, then userId check only
        - `createCheckoutSession()` (:197) — same pattern
        - `cancelOrder()` (:351) — same pattern

        These are partially mitigated by userId checks, but defense-in-depth requires orgId scoping.
      </description>
      <steps>
        - In `src/app/pages/orders/functions.ts`:
          - `updateOrder()`: add `organizationId: ctx.currentOrganization.id` to the findUnique WHERE clause (or use findFirst with compound where)
          - `createCheckoutSession()`: same fix
          - `cancelOrder()`: same fix
        - Note: Prisma `findUnique` only accepts unique fields in `where`. If `id` is the only unique field, switch to `findFirst` with `{ where: { id, organizationId } }` for compound filtering
      </steps>
      <test_steps>
        1. Customer can update/cancel their own order (existing behavior preserved)
        2. Customer cannot interact with orders from other orgs even with valid orderId
        3. Checkout session creation verifies order belongs to customer's org context
      </test_steps>
      <review></review>
    </task>

    <task id="security-stripe-webhook" priority="0" category="functional">
      <title>Fix Stripe webhook: validate order belongs to webhook's org</title>
      <description>
        Security audit finding. Stripe webhook handlers in `src/api/stripe-webhook.ts` modify orders by ID without verifying the order belongs to the org associated with the Stripe account.

        Lines 127, 175, 238, 265, 327, 352: `db.order.findUnique({where: {id: orderId}})` — orderId comes from Stripe webhook metadata (external source).

        An attacker who sets up their own Stripe account and sends crafted webhooks with another vendor's orderId could manipulate payment state.
      </description>
      <steps>
        - In `src/api/stripe-webhook.ts`:
          - After resolving the org from `stripeAccountId` (line 373), pass the `organizationId` to all order lookup functions
          - Add `organizationId` to every order query WHERE clause
          - Pattern: `db.order.findFirst({ where: { id: orderId, organizationId: resolvedOrgId } })`
          - If order not found after adding org filter, log warning and return (don't process)
        - Verify Stripe webhook signature validation is in place (existing — just confirm)
      </steps>
      <test_steps>
        1. Valid Stripe webhook for Evan's order: processes normally
        2. Webhook with orderId from different org: order not found, logged, skipped
        3. Webhook signature validation still enforced
      </test_steps>
      <review></review>
    </task>

    <task id="tenant-middleware" priority="0" category="infrastructure">
      <title>Tenant resolution middleware + AppContext expansion</title>
      <description>
        Core architectural change. Currently each customer page independently resolves vendor org from `?b=slug`. This is duplicated across CustomerHome, PastPopupsPage, and will need to be in every new page. It also means the Header, order links, and share URLs have no access to "which vendor is the user browsing?"

        Add a `browsingOrganization` field to AppContext + a middleware that resolves it from URL before any route handler runs.

        Also add `slug` to `currentOrganization` in AppContext — needed for share URLs and future `/v/` routing.

        RWSDK pattern: middleware in `defineApp()` array mutates `ctx`; all downstream routes see the mutations.
      </description>
      <steps>
        - Expand `AppContext` in `src/worker.tsx` (lines 38-46):
          - Add `slug: string` to `currentOrganization` shape
          - Add `browsingOrganization: { id: string; name: string; slug: string } | null` — the vendor being viewed on customer pages
        - Update middleware where `ctx.currentOrganization` is built (worker.tsx:131-134) to include `slug` from `currentMembership.organization.slug`
        - New file `src/app/middleware/tenant.ts`:
          - Export `resolveBrowsingOrg()` returning a RouteMiddleware
          - Logic: parse URL for `?b=slug` param (and later `/v/:slug`)
          - If slug found: `db.organization.findFirst({ where: { slug, type: 'business' } })` → set `ctx.browsingOrganization`
          - If not found: leave null (homepage will handle via directory or single-business fallback)
          - No auth required — this is for public browsing
        - In `src/worker.tsx`: add `resolveBrowsingOrg()` to `defineApp` array after session middleware, before `render()`
        - Refactor `src/app/pages/home/CustomerHome.tsx`: use `ctx.browsingOrganization` instead of per-page slug resolution
        - Refactor `src/app/pages/markets/PastPopupsPage.tsx`: same
      </steps>
      <test_steps>
        1. Visit `/?b=evan` → `ctx.browsingOrganization` is Evan's org, page renders his markets
        2. Visit `/` (no param) → `ctx.browsingOrganization` is null, homepage handles fallback
        3. Visit `/?b=nonexistent` → `browsingOrganization` is null, show not-found
        4. Admin pages: `ctx.currentOrganization` still works as before, now includes `slug`
        5. `ctx.browsingOrganization` available to Header, layout, and all downstream components
      </test_steps>
      <review></review>
    </task>

    <task id="setup-defaults" priority="1" category="functional">
      <title>Clear hardcoded Setup page defaults</title>
      <description>
        Setup page at /admin/setup pre-fills "evan", "Fresh Catch Seafood Markets", and "fresh-catch-seafood-markets". New vendors see Evan's info.
      </description>
      <steps>
        - In `src/app/pages/admin/Setup.tsx` lines 57-59: change all 3 `useState()` calls to `useState("")`
        - Verify slug auto-generation useEffect (:64-69) still works from empty state
      </steps>
      <test_steps>
        1. Visit `/admin/setup` — all form fields empty
        2. Type a business name — slug auto-generates
        3. Submit with valid data — business created successfully
      </test_steps>
      <review></review>
    </task>

    <task id="header-dynamic" priority="1" category="functional">
      <title>Header reads org name dynamically from context</title>
      <description>
        Header.tsx hardcodes "Evan's Fresh Catch" in 3 places. Now that tenant middleware provides `browsingOrganization`, the customer header can show the browsed vendor's name, and the admin header shows `currentOrganization.name`.
      </description>
      <steps>
        - In `src/components/Header.tsx`:
          - Add `browsingOrganization?: { name: string } | null` to `HeaderProps`
          - Auth variant (line 29): static "Fresh Catch" fallback (no org context on login)
          - Admin variant (line 44): `currentOrganization?.name ?? "Admin"`
          - Customer variant (line 62): `browsingOrganization?.name ?? currentOrganization?.name ?? "Fresh Catch"`
        - Update Header callers (layouts) to pass `browsingOrganization` from ctx
      </steps>
      <test_steps>
        1. Admin header: shows org name (e.g., "Fresh Catch Seafood Markets")
        2. Customer browsing `/?b=evan`: shows "Fresh Catch Seafood Markets"
        3. Customer browsing `/?b=sarahs-bakery`: shows "Sarah's Bakery"
        4. Login page: shows "Fresh Catch"
      </test_steps>
      <review></review>
    </task>

    <task id="org-utils-cleanup" priority="1" category="functional">
      <title>Fix organization utils for multi-business</title>
      <description>
        `getPublicOrganizationName()` is dead code. `getPublicOrganizationId()` always returns first business — breaks when multiple exist. New `getPublicOrganizations()` needed for vendor directory, filtered to businesses with active markets.
      </description>
      <steps>
        - In `src/utils/organization.ts`:
          - Delete `getPublicOrganizationName()` (lines 35-37, never imported)
          - Update `getPublicOrganizationId()`: return ID if exactly 1 business, `null` if 0 or multiple
          - Add `getPublicOrganizations()`: returns businesses that have at least 1 active market — `db.organization.findMany({ where: { type: 'business', markets: { some: { active: true } } }, select: { name: true, slug: true } })`
      </steps>
      <test_steps>
        1. 1 business: `getPublicOrganizationId()` returns its ID
        2. 0 businesses: returns null
        3. 2+ businesses: returns null
        4. `getPublicOrganizations()` excludes businesses with no active markets
      </test_steps>
      <review></review>
    </task>

    <task id="vendor-directory" priority="1" category="functional">
      <title>Vendor directory on homepage when multiple businesses</title>
      <description>
        When `ctx.browsingOrganization` is null (no `?b=` param) and multiple listed businesses exist, show a vendor directory instead of defaulting to the first business.
      </description>
      <steps>
        - In `src/app/pages/home/CustomerHome.tsx`:
          - If `ctx.browsingOrganization` is set: use it (middleware resolved it)
          - Else if `getPublicOrganizationId()` returns an ID: single business, show it (backwards compat)
          - Else: call `getPublicOrganizations()`
            - Empty → existing BusinessNotFound component
            - Has items → render vendor directory: list of business names linking to `/?b={slug}`
        - VendorDirectory component in `src/app/pages/home/components/` — simple card list, design tokens
      </steps>
      <test_steps>
        1. 1 business, no `?b=`: shows that business's page (unchanged)
        2. 2+ businesses, no `?b=`: shows vendor directory with listed businesses
        3. Click vendor in directory → `/?b={slug}` → that vendor's page
        4. Business with no active markets: excluded from directory
      </test_steps>
      <review></review>
    </task>

    <task id="share-url-fix" priority="1" category="functional">
      <title>Fix share URL hardcoded "evan" slug + subdomain model</title>
      <description>
        `getCurrentOrgShareUrl()` hardcodes `organizationSlug: "evan"`. `generateShareUrl()` uses subdomain model. Now that `currentOrganization` has `slug` (from tenant-middleware task), both can be fixed.

        Note: `getCurrentOrgShareUrl()` is a server function called via useEffect from client components — ctx is available in that call path via `requestInfo`.
      </description>
      <steps>
        - In `src/utils/share.ts`:
          - `getCurrentOrgShareUrl()`: read slug from `requestInfo.ctx.currentOrganization?.slug`. Return empty/fallback if no org context.
          - `generateShareUrl()`: change from `https://${slug}.digitalglue.dev` to `${origin}/?b=${slug}`. Get origin from `requestInfo.request.url`. (Becomes `/v/${slug}` in PR2.)
      </steps>
      <test_steps>
        1. Evan's admin share URL: points to `/?b=evan` on current domain
        2. Second vendor admin: points to `/?b={their-slug}`, NOT evan
        3. Social share URLs use correct vendor URL
      </test_steps>
      <review></review>
    </task>

    <task id="livebanner-dynamic" priority="2" category="functional">
      <title>Fix LiveBanner hardcoded market name</title>
      <description>
        LiveBanner.tsx hardcodes "LIVE at Livingston Market". Now that tenant middleware provides `browsingOrganization`, pass market name through the component tree.
      </description>
      <steps>
        - In `src/app/pages/home/components/LiveBanner.tsx`:
          - Accept `marketName?: string` prop
          - Render `LIVE at ${marketName}` or just `LIVE` if no name
        - In `src/app/pages/home/CustomerHomeUI.tsx`:
          - Pass market name from fetched data to LiveBanner
        - In `src/app/pages/home/CustomerHome.tsx`:
          - Include a market name in data passed to CustomerHomeUI (first active regular market name, or org name)
      </steps>
      <test_steps>
        1. Evan's page with live catch: shows "LIVE at [his market name]"
        2. Second vendor with live catch: shows "LIVE at [their market name]"
        3. No live catch: LiveBanner not rendered (existing behavior)
      </test_steps>
      <review></review>
    </task>

    <task id="registration-context-aware" priority="0" category="functional">
      <title>Context-aware customer registration (not org-free)</title>
      <description>
        Both registration functions hardcode `db.organization.findFirst({ where: { name: "Fresh Catch Seafood Markets" } })` to auto-link every customer to Evan's business.

        Going fully org-free breaks ordering: 10+ links to `/orders/new` across the codebase have no vendor context. New customers would have no vendor org in session and couldn't order.

        Better approach: DYNAMIC linking. Use `ctx.browsingOrganization` (from tenant middleware) to link the customer to the vendor they're currently browsing. No browse context = no auto-link (truly org-free). This preserves the working order flow for customers who register from a vendor page.
      </description>
      <steps>
        - In `src/app/pages/user/functions.ts`:
          - `registerWithPassword()` (:140-185):
            - Replace hardcoded "Fresh Catch" lookup (lines 163-172) with: read `ctx.browsingOrganization` from requestInfo
            - If browsing a vendor: create customer membership to THAT org, set session to that org
            - If not browsing a vendor: individual org only, no auto-link
          - `finishPasskeyRegistration()` (:216-324):
            - Same change: replace lines 298-311 with dynamic `browsingOrganization` lookup
            - Session save uses browsed org or individual org
          - Delete console.log mentioning "Fresh Catch" (:320)
        - Note: login/registration pages need the tenant middleware to have run so `ctx.browsingOrganization` is available. This works because middleware runs before route handlers.
        - Registration links on vendor pages (`/?b=slug`) already include the `?b=` param in the URL, so when user navigates to `/login` from a vendor page, the middleware can still see the referer context. However, the simpler approach: pass `?b=slug` as a hidden field or query param through the auth flow so it persists across the registration steps.
      </steps>
      <test_steps>
        1. Register from `/?b=evan` → customer linked to Evan's org, session set to Evan's org, can order immediately
        2. Register from `/?b=sarahs-bakery` → linked to Sarah's org, NOT Evan's
        3. Register from `/login` directly (no `?b=`) → individual org only, no vendor link
        4. Existing users unaffected
        5. Quick Order button works immediately after registration from a vendor page
      </test_steps>
      <review></review>
    </task>

    <task id="remove-join-codes" priority="1" category="functional">
      <title>Remove join code flow, keep invite system</title>
      <description>
        Join codes use global env vars that always link to "Fresh Catch Seafood Markets". Can't scope to a vendor. The invite system already covers this correctly.
      </description>
      <steps>
        - Delete `src/app/pages/user/JoinPage.tsx` and `src/app/pages/user/JoinUI.tsx`
        - In `src/app/pages/user/functions.ts`:
          - Delete `addMembershipWithJoinCode()` (:432-488) and `finishJoinCodeRegistration()` (:490+)
        - In `src/app/pages/user/routes.ts`:
          - Remove JoinPage import
          - Replace `/join` route with redirect to `/login`
          - Keep `/join/invite` (AcceptInvitePage)
        - Grep + remove `ADMIN_CODE` / `MANAGER_CODE` references
      </steps>
      <test_steps>
        1. `/join` redirects to `/login` (302)
        2. `/join/invite?token=valid` still works
        3. No references to `ADMIN_CODE` or `MANAGER_CODE` in source
        4. Invite flow: create invite → share link → accept → correct org membership
      </test_steps>
      <review></review>
    </task>

    <task id="login-org-resolution" priority="1" category="functional">
      <title>Login prefers most recently joined business org</title>
      <description>
        Login uses `memberships.find(m => m.organization.type === "business")` — nondeterministic with multiple businesses. Sort by `createdAt: 'desc'`. (PR2 adds `updatedAt` for true "last used" sorting.)
      </description>
      <steps>
        - In `src/app/pages/user/functions.ts`:
          - `finishPasskeyLogin()` (:386-430): add `orderBy: { createdAt: 'desc' }` to memberships include
          - `loginWithPassword()` (:91-115): same fix
      </steps>
      <test_steps>
        1. User with 1 business: login works as before
        2. User with 2 businesses: picks most recently joined
        3. User with only individual org: lands in individual org context
      </test_steps>
      <review></review>
    </task>

    <!-- ==================== PR2: bbb-org-free-browsing ==================== -->

    <task id="vendor-profile-route" priority="1" category="functional">
      <title>Add /v/{slug} public vendor profile route</title>
      <description>
        Clean URL for vendor pages. Update tenant middleware to also parse `/v/:slug` from route params. The `?b=slug` pattern remains for backwards compat.
      </description>
      <steps>
        - In `src/worker.tsx`: add `route("/v/:slug", VendorProfilePage)` (public, no auth)
        - Update tenant middleware (`src/app/middleware/tenant.ts`):
          - Also check route params for `slug` (from `/v/:slug`)
          - Priority: route param > query param
        - New `src/app/pages/home/VendorProfilePage.tsx`:
          - Server component: `ctx.browsingOrganization` already resolved by middleware
          - If null (bad slug): render not-found
          - Else: reuse same data fetching + `CustomerHomeUI`
        - Update `generateShareUrl()` to use `/v/{slug}` instead of `/?b={slug}`
      </steps>
      <test_steps>
        1. `/v/evan` renders Evan's customer page
        2. `/v/sarahs-bakery` renders Sarah's page
        3. `/v/nonexistent` shows not-found
        4. `/?b=evan` still works
        5. Share URLs now use `/v/{slug}` format
      </test_steps>
      <review></review>
    </task>

    <task id="membership-on-order" priority="1" category="functional">
      <title>Create customer membership at order time</title>
      <description>
        For customers who browse org-free (registered without vendor context), membership forms when they order. Tenant middleware provides `browsingOrganization` so the order page knows which vendor.
      </description>
      <steps>
        - In `src/app/pages/orders/functions.ts` (`createOrder`):
          - Accept vendor org from `ctx.browsingOrganization` or `ctx.currentOrganization`
          - Before creating order: check if customer has membership to that org
          - If not: `db.membership.create({ userId, organizationId, role: "customer" })`
          - Update session to that org context
          - Then proceed with order creation
        - Order links (`/orders/new`) across codebase: ensure they include `?b=slug` when rendered on a vendor page (so tenant middleware resolves the vendor on the order page too)
      </steps>
      <test_steps>
        1. Org-free customer browses `/v/sarahs-bakery` — no membership
        2. Customer clicks order → membership created at order time
        3. Customer with existing membership → no duplicate, order proceeds
        4. Order appears in vendor's admin
      </test_steps>
      <review></review>
    </task>

    <task id="cross-vendor-orders" priority="2" category="functional">
      <title>Orders page shows orders across all vendors</title>
      <description>
        Customer `/orders` page currently filters by `organizationId`. Show all orders labeled with vendor name.
      </description>
      <steps>
        - In `src/app/pages/orders/CustomerOrdersPage.tsx`:
          - Remove `organizationId` filter, query by `userId` only
          - Include `organization: { select: { name: true, slug: true } }`
          - Pass org info to `CustomerOrdersUI`
        - In `CustomerOrdersUI.tsx`:
          - Show vendor name per order (badge or subtitle)
      </steps>
      <test_steps>
        1. Orders from 1 vendor: unchanged behavior
        2. Orders from 2 vendors: all shown with vendor labels
        3. Order detail still works
      </test_steps>
      <review></review>
    </task>

    <task id="membership-updated-at" priority="2" category="infrastructure">
      <title>Add updatedAt to Membership schema</title>
      <description>
        Enables org switcher to "touch" membership on switch, so login picks most recently USED org.
      </description>
      <steps>
        - In `prisma/schema.prisma` Membership model: add `updatedAt DateTime @updatedAt`
        - Create + apply migration
        - Update login functions to sort by `updatedAt` instead of `createdAt`
      </steps>
      <test_steps>
        1. Migration applies cleanly
        2. Existing memberships get `updatedAt` populated
        3. Login still picks correct org
      </test_steps>
      <review></review>
    </task>

    <task id="org-switcher-functions" priority="2" category="functional">
      <title>Server functions for org listing + switching</title>
      <description>
        Server-side logic for listing a user's business orgs and switching the active org.
      </description>
      <steps>
        - New file `src/app/pages/user/org-functions.ts` with `"use server"`:
          - `listUserOrganizations()`: query business memberships for current user, return `{ id, name, slug, role }[]`
          - `switchOrganization(orgId)`: verify membership, update session, touch membership `updatedAt`
      </steps>
      <test_steps>
        1. Returns correct list for current user
        2. Valid switch: session updated, membership touched
        3. Invalid orgId: error, session unchanged
        4. No membership: error
      </test_steps>
      <review></review>
    </task>

    <task id="org-switcher-ui" priority="2" category="functional">
      <title>Org switcher dropdown in admin header</title>
      <description>
        UI dropdown when user has 2+ business memberships. Admin header only.
      </description>
      <steps>
        - In `src/components/UserMenu.tsx`:
          - On mount: call `listUserOrganizations()`
          - If 2+ orgs: render dropdown, current org highlighted
          - On select: call `switchOrganization()`, reload page
        - Style with design tokens, admin variant only
      </steps>
      <test_steps>
        1. Admin with 1 business: no switcher
        2. Admin with 2+ businesses: dropdown visible
        3. Switch works, admin shows new org data
        4. Header shows new org name
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Security: order IDOR and Stripe webhook cross-tenant vulnerabilities fixed
    - Tenant resolution centralized in middleware, not scattered per page
    - Second vendor signs up via /admin/setup, operates independently (markets, orders, team, catch, Stripe)
    - No data leaks between vendors (queries scoped, share URLs correct, header shows right name)
    - Existing Evan setup unchanged
    - Customer registration links to browsed vendor dynamically (not hardcoded)
    - Customers browse vendor pages; membership forms at order time
    - Cross-vendor order history with vendor labels
    - Multi-org admins can switch between businesses
  </success_criteria>
</project_specification>
