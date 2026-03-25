# Multi-Tenant Routing Refactor - Planning & Todo

## ⚠️ IMPORTANT: Working Protocol

**DISCUSS BEFORE IMPLEMENTING**

Before starting any phase or major feature:
1. **Stop and discuss** the approach with user
2. **Review design decisions** together (don't assume)
3. **Confirm the flow** before writing code
4. **Make small, incremental changes** - not sweeping refactors

This is a collaborative design process. The plans below are proposals, not decisions.

---

## Vision
Transform from single-tenant to multi-tenant SaaS where multiple business owners can register, manage their markets, and share links with their customers.

## Core User Flows (Proposed)

### Business Owner (Vendor) Flow
```
1. Visit /start → Vendor signup page
2. Create account + business → Auto-login
3. Redirect to /admin → Market setup wizard
4. Add markets → Get shareable link
5. Share link with customers → yoursite.com/?b=evan
```

### Customer Flow
```
1. Visit yoursite.com/?b=evan → See Evan's markets
2. Browse markets, favorite (no login needed)
3. Order fish (future feature)
```

### Multi-Business Discovery Flow
```
1. Visit yoursite.com/ → Smart behavior:
   - If only 1 business exists → Show their markets
   - If multiple businesses exist → Show directory
2. Browse businesses → Click to view markets
3. "Are you a vendor?" → Link to /start
```

---

## Routing Structure (Proposed)

### Customer-Facing Routes
```
/                           → Smart root (see logic below)
/?b=evan                    → Evan's customer markets
/?b=joes-farm               → Joe's customer markets
/businesses                 → Directory of all businesses (Phase 2)
```

### Vendor-Facing Routes
```
/start                      → Vendor signup (create account + business)
/admin                      → Admin dashboard (requires login)
/admin/config               → Market configuration
/admin/setup                → DEPRECATED (replaced by /start)
```

### Authentication Routes
```
/login                      → Login page (both customers & vendors) ✅ IMPLEMENTED
/logout                     → Logout ✅ IMPLEMENTED
```

**Implementation Note:** Auth routes were moved from `/user/*` to root level for simpler multi-tenant UX. One account can have multiple roles (customer + business owner).

### Smart Root Logic (`/`) - Proposed
```javascript
if (query param 'b' exists) {
  // Show that business's customer markets
  return <CustomerHome businessSlug={b} />
}

const businessCount = await db.organization.count({ where: { type: 'business' }});

if (businessCount === 0) {
  // No businesses yet → Show vendor signup CTA
  return <GetStartedPage />
}

if (businessCount === 1) {
  // Only one business → Auto-show their markets
  const business = await db.organization.findFirst({ where: { type: 'business' }});
  return <CustomerHome businessSlug={business.slug} />
}

// Multiple businesses → Show directory
return <BusinessDirectory />
```

---

## Phase 1: Fix Current Routing (Immediate)

**STATUS:** ✅ COMPLETE (2025-10-11)

**Decisions Made:**
- ✅ Query param approach confirmed (`?b=evan` for business routing)
- ✅ Organization slug design:
  - **Business orgs:** Readable slugs (e.g., "evan") for public sharing
  - **Customer orgs:** UUID slugs (private, never shared)
- ✅ Admin setup flow: Auto-login + redirect to `/admin` dashboard
- ✅ **Auth routes unified:** `/login` and `/logout` (not `/user/login`)

### Goal
Make the app usable for Evan right now with proper flow. ✅ ACHIEVED

### Problems Solved
1. ✅ `/` shows CustomerHome (Evan's markets)
2. ✅ `/customer` route removed (consolidated to `/`)
3. ✅ `/admin/setup` now auto-logins and redirects to `/admin`
4. ✅ Customer link works: `/?b=evan`

### Proposed Changes

#### 1. Fix Root Route (`/`)
**Current:** Shows "Hello World"
**Proposed:** Show Evan's markets (since he's the only business)

**File:** `src/worker.tsx`

```tsx
// Before
route("/", () => new Response("Hello, World!")),
route("/customer", CustomerHome),

// After
route("/", CustomerHome),  // Remove /customer route
```

**Discussion needed:**
- Is this the right default behavior?
- Should we keep `/customer` as an alias?

#### 2. Update CustomerHome to Handle Business Query Param
**Goal:** Prepare for multi-tenant even though we're single-tenant now

**File:** `src/app/pages/CustomerHome.tsx`

Add business slug detection:
```tsx
export async function CustomerHome({ ctx, request }: RequestInfo) {
  // Get business slug from query param or default to first business
  const url = new URL(request.url);
  const businessSlug = url.searchParams.get('b');

  let orgId: string;

  if (businessSlug) {
    // Look up business by slug
    const org = await db.organization.findFirst({
      where: { slug: businessSlug, type: 'business' }
    });

    if (!org) {
      return <div>Business not found</div>;
    }

    orgId = org.id;
  } else {
    // Default: Use getPublicOrganizationId (current behavior)
    orgId = getPublicOrganizationId();
  }

  // Fetch markets for this organization
  const markets = await db.market.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { name: "asc" }
  });

  return <CustomerHomeUI markets={markets} ... />;
}
```

**Discussion needed:**
- Is `?b=` the right parameter name?
- What should "business not found" look like?
- Should we cache org lookups?

#### 3. Add `slug` Field to Organization Model
**Goal:** Enable readable URLs like `?b=evan` instead of `?b=uuid`

**File:** `prisma/schema.prisma`

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique  // NEW: URL-friendly identifier
  type      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships Membership[]
  markets     Market[]
}
```

**Discussion needed:**
- Should slug be editable by user or auto-generated?
- How to handle slug conflicts?
- What characters allowed in slug?

**Migration:** `pnpm run migrate:new add organization slug`

**Seed Update:** Add slug for Evan's org
```tsx
// In seed script
const org = await db.organization.upsert({
  where: { id: "fresh-catch-seafood-org-id" },
  update: {},
  create: {
    id: "fresh-catch-seafood-org-id",
    name: "Evan's Fresh Catch Seafood",
    slug: "evan",  // NEW
    type: "business"
  }
});
```

#### 4. Fix Admin Setup Redirect Flow
**Current:** `/admin/setup` → registers user → redirects to `/user/login`
**Problem:** User has to log in again after registering

**File:** `src/app/pages/admin/Setup.tsx`

**Discussion needed:**
- Should registration auto-login?
- Where to redirect after registration? (`/admin` or `/admin/config`?)
- Should we show a welcome message first?

#### 5. Test Phase 1 Changes
- ✅ Visit `/` → See Evan's markets (not "Hello World")
- ✅ Visit `/?b=evan` → See Evan's markets (same as above)
- ✅ Go to `/admin/setup` → Create account → Auto-redirect to `/admin` dashboard
- ✅ Admin can access `/admin/config` to manage markets
- ✅ Customer link `/?b=evan` works and shows markets
- ✅ BusinessNotFound error page for invalid slugs (`/?b=invalid`)

**Additional Improvements Implemented:**
- ✅ `/admin` dashboard created with navigation cards
- ✅ Smart login redirect (admin → `/admin`, customer → `/`)
- ✅ Defensive CSS pattern for consistent styling
- ✅ Enhanced error pages with helpful messages
- ✅ Username uniqueness validation (passkey requirement)
- ✅ Customer org slug uses UUID (no collision risk)

---

## Phase 2: Add Business Directory (Multi-Tenant Foundation)

**STATUS:** 🟡 READY FOR DISCUSSION (Phase 1 Complete)

⚠️ **IMPORTANT: Review Before Implementing**
Based on Phase 1 learnings, reconsider:
- `/start` vs keeping `/admin/setup` for new vendor signups
- Current approach: Customers use `/login`, business owners use `/admin/setup`
- This separation works well - customers never see admin flow
- **Question for Phase 2:** Should `/start` replace `/admin/setup` or keep both?
  - Keeping separate avoids confusion for launch customers
  - Database already supports customer → vendor conversion (same account, add business org)

**Before starting, discuss:**
- [ ] Review `/start` route necessity (vs keeping `/admin/setup`)
- [ ] Discuss business directory design
- [ ] Review share link UI/UX
- [ ] Confirm smart root behavior for multiple businesses
- [ ] Business slug collision strategy (sequential numbers? taken message?)

### Goal
Support multiple businesses with discovery mechanism.

### Proposed Tasks

#### 1. Create `/start` Vendor Signup Page
**Replace:** `/admin/setup` (which is confusing for multi-tenant)

**Discussion needed:**
- What info to collect during signup?
- Should business name → slug be auto-generated or editable?
- Single-page or multi-step flow?
- What happens after successful signup?

#### 2. Create Business Directory Page
**Route:** `/` (when multiple businesses exist)

**Discussion needed:**
- What should directory look like?
- How to organize businesses? (alphabetical, by location, by category?)
- Search functionality needed immediately or later?
- "Add your business" CTA placement and design?

#### 3. Update Root Route with Smart Logic

**Discussion needed:**
- Confirm the "smart root" behavior makes sense
- Should single business auto-redirect to `/?b=slug` or just render?
- What should happen when businessCount === 0?

#### 4. Add Share Link Generator to Admin

**Discussion needed:**
- Where should share link appear? (dashboard, config page, both?)
- What actions? (copy, QR code, email, SMS?)
- How to track if link is being used (analytics)?

---

## Phase 3: Polish & UX Enhancements

**STATUS:** 🔴 NEEDS DISCUSSION AFTER PHASE 2

**Before starting, discuss:**
- [ ] What polish features are priority?
- [ ] Branding customization scope
- [ ] Search functionality requirements
- [ ] Landing page design

### Proposed Tasks
- Business branding customization
- Search in directory
- Get started landing page
- Business slug validation
- Deprecate `/admin/setup`

---

## Technical Considerations

### Organization Context (Current: `getPublicOrganizationId()`)

**Current:** Returns hardcoded ID
**Phase 1:** Add support for slug lookup
**Phase 2:** Use slug from `?b=` param

**Discussion needed:**
- How to handle backward compatibility?
- Should we cache organization lookups?
- Error handling strategy?

### URL Structure Alternatives (Future)

**Query Param (Proposed):**
```
/?b=evan          → Evan's markets
/?b=joes-farm     → Joe's markets
```

**Path-based (Alternative):**
```
/evan             → Evan's markets
/joes-farm        → Joe's markets
```

**Subdomain (Future):**
```
evan.marketplace.com     → Evan's markets
joes-farm.marketplace.com → Joe's markets
```

**Discussion needed:**
- Confirm query param is best for Phase 1-2
- When (if ever) to migrate to subdomains?

---

## Open Questions (To Discuss)

1. **Business naming conflicts:** What if two vendors want "Joe's Farm"?
   - Auto-append number? (joes-farm-2)
   - Show taken status and suggest alternatives?

2. **Admin login context:** Should admin login always redirect to `/admin`, or remember where they were?

3. **Customer accounts:** Phase 1 is anonymous. When we add customer accounts:
   - How do favorites migrate from localStorage to account?
   - Can customers follow multiple businesses?

4. **Business verification:** Should we verify business owners (prevent spam)?
   - Email verification?
   - Manual approval?
   - Freemium → paid for multi-market businesses?

5. **Error pages:** What should users see for:
   - Business not found (`/?b=invalid`)
   - No markets configured yet
   - Network errors

6. **Mobile navigation:** How should business directory work on mobile?
   - Cards, list, map view?
   - Filter/sort options?

---

## Files Overview (Estimated)

### New Files (Phase 1)
- `migrations/0004_add_organization_slug.sql` - Add slug field

### Modified Files (Phase 1)
- `src/worker.tsx` - Change `/` route
- `src/app/pages/CustomerHome.tsx` - Add business slug detection
- `src/app/pages/admin/Setup.tsx` - Fix redirect after registration
- `prisma/schema.prisma` - Add slug field to Organization

### New Files (Phase 2) - TBD based on discussion
- Vendor signup pages
- Business directory pages
- Share link components

---

## Next Steps

1. **Discuss Phase 1 approach** - Review routing strategy, slug design, flows
2. **Agree on first task** - Start with smallest change (likely: fix `/` route)
3. **Implement incrementally** - Small changes, test frequently
4. **Review before Phase 2** - Discuss directory and multi-tenant UX

---

**Last Updated:** 2025-10-11
**Current Status:** Phase 1 Complete ✅ | Phase 2 Ready for Discussion 🟡
**Phase 1 Completion:** Multi-tenant routing foundation, unified auth, admin dashboard
**Next Discussion:** Phase 2 - Business directory, `/start` route strategy, slug conflicts
