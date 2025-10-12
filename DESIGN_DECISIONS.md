# Fresh Catch - Design & Architecture Decisions

*Living document capturing key decisions for reference and guidance*

## Project Overview
**Goal:** Enable Evan to manage his seafood market schedule and display it to customers
**Framework:** RedwoodSDK (RWSDK) with React Server Components
**Design System:** Modern Fresh - Ocean/coral/mint theme with glassmorphism

---

## Data Architecture Decisions

### Multi-Tenant Data Model (2024-11-13)
**Decision:** Linear multi-tenant model with Organization + User + Membership tables
**Context:** Need to support:
- Evan (business owner/admin)
- Future managers
- Individual customers
- Future business customers with multiple employees

**Model:**
- Every user can belong to multiple organizations
- Individual customers get their own Organization (type: 'individual')
- Business customers get shared Organization (type: 'business')
- Role-based access via Membership table

**Rationale:** Scales seamlessly from MVP (Evan solo) to enterprise (business customers with bulk ordering)

### Database Schema Approach (2024-11-13)
**Decision:** Add `organization_id` to all business entities except User table
**Context:** Need org-level data isolation for multi-tenant security
**Rationale:** Following Linear SaaS model best practices - simple, secure, scalable

---

## Component Architecture Decisions

### Design System Strategy (2024-11-13)
**Decision:** Single components with role-based behavior vs separate admin/customer components
**Context:** Markets page, MarketCard, Header need both admin editing and customer viewing
**Rationale:** DRY principle, consistent design, easier maintenance, shared design tokens
**Implementation Pattern:**
```tsx
// Role-based props instead of separate components
<MarketCard adminMode={user.isAdmin} {...data} />
<Header variant={user.isAdmin ? 'admin' : 'customer'} />
```

### Auth Components Strategy (2024-11-13)
**Decision:** Shared auth components in design system with variants
**Context:** Admin and customer login should look consistent but may need different flows
**Components:** LoginForm, RegisterForm, AuthButton, AuthGuard, UserMenu
**Rationale:** Consistent styling, single auth logic, maintainable, design system cohesion

---

## Phase 1 MVP Scope Decisions

### Phase 1 Boundaries (2024-11-13)
**IN SCOPE:**
- Evan admin login & authentication
- Customer registration (individual + business customers)
- Market setup & management (9 markets on 2-week rotation)
- Daily schedule management (cancel markets, add special events)
- Customer market display (read-only)
- Local favorites (localStorage for anonymous users)
- Basic responsive design

**OUT OF SCOPE (Phase 2):**
- Customer ordering & payment
- Business customer employee invitations
- Order management
- Advanced scheduling (recurring patterns)
- Multi-vendor platform features

### Routing Strategy (2024-11-13)
**Decision:** Role-based UI on shared pages vs separate admin routes
**Context:** Admin needs to edit markets, customers need to view markets
**Routes:**
- `/` - Customer home (everyone)
- `/markets` - Shared markets page (role-based UI)
- `/user/login` - Shared auth
- `/admin/setup` - Admin market management
- `/admin/schedule` - Admin daily operations

**Rationale:** Simpler to maintain, natural user flow, leverages RWSDK middleware

---

## User Experience Decisions

### Admin Workflows (2024-11-13)
**Setup Workflow:** Login → Market Management → Configure 9 markets → Auto-populate calendar
**Daily Workflow:** Login → Schedule Management → Cancel/add events → Customer view
**Context:** Evan has established 2-week rotation, needs exception handling more than setup

### Customer Experience (2024-11-13)
**Anonymous Users:** Can view all markets, set local favorites (localStorage)
**Future Registered Users:** Import favorites, set preferences, place orders (Phase 2)
**Context:** Phase 1 focuses on information display, Phase 2 adds transactions

### Local Favorites Strategy (2024-11-13)
**Decision:** localStorage for anonymous users, no registration required
**Context:** Customers need immediate value without friction
**Rationale:** Removes registration barrier, provides instant utility, easy Phase 2 upgrade path

### Customer Market Display Approach (2025-01-04)
**Decision:** Simplified schedule display with two-section discovery pattern
**Context:** Balance between simplicity (Phase 1) and user discovery needs
**Market Data Fields:**
- ✅ Keep: `name`, `schedule` (e.g., "Sat 8-2"), `subtitle` (optional)
- ❌ Defer: Specific dates, calculated "days away" status, live indicators
**Display Strategy:**
1. **"Your Markets"** section - Shows favorited markets (from localStorage)
2. **"All Markets"** section - Shows all active markets for discovery
**Rationale:**
- Admin controls schedule as simple text (no date calculations needed)
- Two sections solve discovery problem for older adults (60+)
- Favorites reduce cognitive load for repeat users
- All Markets ensures new location awareness
**Deferred to Future Phases:**
- Date calculations and "3 days away" status indicators
- "Live now" indicators (requires Evan manual toggle or geofencing)
- Time-based automatic status detection

**Technical Implementation (RWSDK Pattern):**
```tsx
// CustomerHome.tsx (Server Component)
export async function CustomerHome({ ctx }) {
  const orgId = getPublicOrganizationId(); // Hardcoded for Phase 1
  const markets = await db.market.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { name: 'asc' }
  });
  return <CustomerHomeUI markets={markets} />
}

// CustomerHomeUI.tsx (Client Component - "use client")
export function CustomerHomeUI({ markets }) {
  const [favorites, setFavorites] = useFavorites(); // localStorage hook
  const favoriteMarkets = markets.filter(m => favorites.includes(m.id));
  const allMarkets = markets;

  return (
    <>
      {favoriteMarkets.length > 0 && <YourMarkets markets={favoriteMarkets} />}
      <AllMarkets markets={allMarkets} favorites={favorites} onToggleFavorite={...} />
    </>
  );
}
```

**Organization Context for Phase 1:**
- Hardcode Evan's organization ID in utility function
- Future: Replace with subdomain detection, route params, or env var
- Single source of truth for easy migration to multi-tenant

### Phase 1 Authentication Strategy (2024-11-14)
**Decision:** Context-aware LoginForm with business-scoped customer registration
**Context:** Two user types - Business Owners (create markets) vs Customers (buy from businesses)
**Registration Flows:**
- **Business Context:** Customers on Evan's portal register as his customers automatically
- **Platform Context:** Future business owners register to create their own markets (Phase 2)
**User Types:**
- **Evan (Admin):** Owner of "Fresh Catch Seafood Markets" with automatic admin context
- **Evan's Customers:** Register via his portal, auto-linked to his business
- **Individual Customers:** Auto-create "individual" organization
- **Business Customers:** Create "business" organization for bulk ordering
**Implementation:** Single LoginForm component that's context-aware (knows which business)
**Future Path:** Same component scales to multi-business platform via domain/route context
**Rationale:** Seamless customer experience, scalable architecture, no "shared" complexity

### Session Management & Organization Context (2024-11-14)
**Decision:** Extend RWSDK sessions with organization context for multi-tenant support
**Context:** Users can belong to multiple organizations, need current org context throughout app
**Implementation:**
- Session interface includes `currentOrganizationId` and `role`
- Middleware auto-loads user memberships and sets default organization
- AppContext provides `currentOrganization` with full org details and user's role
- Organization switching available for users with multiple memberships
**Rationale:** Built-in multi-tenant security, role-based UI becomes simple, organization-scoped queries automatic

---

## Technical Implementation Decisions

### Design System Integration (2024-11-13)
**Decision:** Import tokens.css in each page, use existing components
**Context:** Design system is complete, components tested, need consistency
**Rationale:** Proven design system, fast implementation, visual cohesion

### Glassmorphism Pattern Consistency (2024-11-13)
**Decision:** Use consistent glassmorphism pattern across all UI elements
**Context:** Bottom nav, hero sections, header all use glass effects
**Implementation Pattern:**
- Semi-transparent white backgrounds (`rgba(255,255,255,0.1)`)
- White borders with subtle opacity (`rgba(255,255,255,0.2)`)
- Blur effects (`backdropFilter: blur(10px)`)
- Maintain pattern for inactive states while active states use solid gradients
**Rationale:** Visual cohesion, modern premium feel, Instagram-ready aesthetic

### RWSDK Patterns (2024-11-13)
**Decision:** Follow co-located routes pattern, middleware for auth
**Context:** RWSDK best practices for route organization and session management
**Implementation:**
- `/user/routes.ts` for auth
- `/admin/routes.ts` for admin functions
- Middleware for session + role context

### RWSDK Data Fetching Pattern (2025-01-04)
**Decision:** Server Components + Server Functions (not JSON APIs)
**Context:** Need data fetching pattern for market CRUD operations
**Options Considered:**
1. Traditional JSON API routes with fetch() in client components
2. Server Components that fetch data + Server Functions for mutations
**Decision:** Option 2 - Server Components + Server Functions
**Implementation Pattern:**
```tsx
// Page.tsx (server component) - fetches data
export async function MarketConfigPage({ ctx }) {
  const markets = await db.market.findMany({ where: { organizationId: ctx.currentOrganization.id }});
  return <MarketConfigUI markets={markets} />
}

// UI.tsx ("use client") - receives data, calls server functions
"use client";
import { createMarket, updateMarket } from "./functions";
export function MarketConfigUI({ markets }) {
  // Interactive UI, calls server functions for mutations
}

// functions.ts ("use server") - mutations
"use server";
export async function createMarket(data) {
  const { ctx } = requestInfo;
  await db.market.create({ data: { ...data, organizationId: ctx.currentOrganization.id }});
  revalidatePath("/admin/config");
}
```
**Rationale:**
- More idiomatic to rwsdk's React Server Components architecture
- Eliminates need for JSON API layer and fetch() calls
- Server components have direct database access
- Server functions automatically have request context
- Simpler data flow: Server → Props → Client → Server Functions
- Better performance (no extra network hop for initial data)
**When to use JSON APIs:** Only for external clients (mobile apps, webhooks, third-party integrations)

### Admin Dashboard Design (2025-10-11)
**Decision:** Minimal dashboard with equal-priority navigation cards using responsive grid
**Context:** Need `/admin` landing page that serves as control center for daily operations (inventory and orders features coming soon). Primary users are farmers, merchants, carpenters at different skill levels - simplicity is critical.
**Options Considered:**
1. Comprehensive dashboard with stats, charts, and navigation
2. Minimal navigation-only dashboard with big button cards
3. Skip dashboard entirely, redirect `/admin` directly to `/admin/config`
**Rationale:**
- **Industrial design principles:** Form follows function, clarity of purpose over decoration
- **Big button approach:** No ambiguity about clickability, reduced cognitive load, faster visual processing
- **Equal visual weight:** Right now both actions (Markets, View Site) are high priority; future cards (Inventory, Orders) will naturally integrate into grid
- **Mobile-first responsive grid:** 1 column mobile, 2 columns desktop, grows naturally as features added
- **Control center concept:** Central hub for daily admin tasks (managing inventory/orders will be daily, markets weekly)
**Implementation:**
- Reuses admin-auth.css structure (proven, consistent styling)
- CSS Grid with automatic responsiveness (no complex breakpoint logic)
- Button-style cards (~120px height minimum for tap-friendliness)
- Icon → Title → Description hierarchy for clarity
**Future Growth Path:** Add Inventory and Orders cards as top row priority when features launch, Markets and View Site move to secondary positions

### Unified Authentication Routes (2025-10-11)
**Decision:** Use `/login` and `/logout` (not `/user/login` and `/user/logout`)
**Context:** Multi-tenant SaaS where users can have multiple roles across different organizations. Evan (admin) will also browse other businesses as a customer. Separating "user" vs "admin" login creates confusion about which to use.
**Options Considered:**
1. Keep separate routes: `/user/login` for customers, `/admin/login` for business owners
2. Unified route: `/login` for everyone, role-based redirect after authentication
**Rationale:**
- **One account, multiple contexts:** Users have single login but different roles in different organizations
- **Simpler mental model:** "Where do I login?" → "Just /login" (not "Am I a user or admin?")
- **Multi-tenant architecture:** Session already tracks `currentOrganizationId` and `role`, middleware handles context switching
- **Smart redirect logic:** After login, check user's roles and redirect appropriately (admin → `/admin`, customer → `/`)
**Implementation:**
- Moved userRoutes from `prefix("/user")` to root level in worker.tsx
- Updated all redirect locations from `/user/login` → `/login`
- Enhanced `finishPasskeyLogin` to return `{ success: boolean, isAdmin: boolean }`
- Login component uses `isAdmin` flag for smart redirect
- Session now includes organization context immediately after login (no second request needed)
**Benefits:**
- Consistent with multi-tenant mental model
- One less decision point for users
- Scales naturally when users belong to multiple organizations
- Simpler URL structure

---

## Pending Decisions

### Admin Header Variant
**Options:**
1. Same header with "Admin Mode" badge
2. Different accent color (coral instead of ocean)
3. Completely different admin header

**Need to decide:** Visual approach for admin distinction

### Market Setup UX
**Options:**
1. Multi-step wizard for 9 markets
2. Single form with all markets
3. Import/bulk entry option

**Need to decide:** Balance between ease-of-use and speed for Evan

### Admin/Customer Navigation
**Options:**
1. Role toggle on shared pages
2. Separate admin navigation
3. Context-sensitive bottom nav

**Need to decide:** How admin switches between admin and customer views

---

## Decision Template

### [Decision Name] (Date)
**Decision:** [What we chose]
**Context:** [Why we needed to decide]
**Options:** [What we considered]
**Rationale:** [Why we picked this]
**Implementation:** [How it works in code]

---

*Last Updated: 2024-11-14*
*Next Review: Phase 1 completion*

## Implementation Progress

### CustomerHome.tsx Foundation (2024-11-14)
**Completed:** Full customer homepage with mocked data
**Components:** Header, LiveBanner, FreshHero, MarketsSection, QuickActions, BottomNavigation
**Data Strategy:** Mock data for immediate visual feedback and development
**Design Integration:** All design tokens implemented, glassmorphism pattern applied consistently
**Status:** ✅ Ready for responsive testing and data integration

### Admin Setup & Login System Implementation (2024-11-14)
**Completed:** Complete authentication system with modern UX
**Components:** Admin Setup (/admin/setup), Enhanced Login (/user/login)
**Key Features:**
- **Separate Admin Setup Flow:** Dedicated registration for business owners with existing org linking
- **Enhanced UX Design:** Progressive feedback, auto-redirect, status management, loading animations
- **Modern Design System Integration:** TextInput, Button, Container components with glassmorphism
- **Unified Authentication:** Single login page supporting both customers and admins with mode switching
- **Professional Polish:** Color-coded status, smooth transitions, clear error handling

**Architecture Decisions:**
- **Admin Functions:** Separate server functions for business owner registration vs customer registration
- **Status-Based UI:** Explicit state management (idle/loading/success/error) for better UX
- **WebAuthn Integration:** Seamless passkey authentication with step-by-step guidance
- **Organization Linking:** Smart logic to find/link existing entities vs create new ones

**Technical Fixes:**
- Fixed jsx attribute errors in design system components (SpecialEventCard, QuickActions)
- Cleaned up debug code and console logs
- Consistent design system usage across all authentication flows

**Status:** ✅ Production-ready authentication system with professional UX

### Role-Based Session Management & Organization Context (2024-11-14)
**Completed:** Full multi-tenant session architecture with automatic organization context
**Implementation:** Extended RWSDK sessions with organization-aware middleware
**Key Features:**
- **Extended Session Model:** Added `currentOrganizationId` and `role` to session storage
- **Auto-Context Detection:** Middleware automatically sets organization context from user memberships
- **AppContext Integration:** Full organization details (id, name, type) and user role available in all components
- **Multi-Tenant Security:** Organization-scoped queries and role-based access built into request context
- **Default Organization Logic:** Smart defaults to first membership when session lacks org context

**Architecture Benefits:**
- **Server Components:** Access role via `ctx.currentOrganization.role` prop
- **Server Functions:** Access role via `requestInfo.ctx.currentOrganization.role`
- **Role-Based UI:** Components can conditionally render based on user role (owner/manager/customer)
- **Future-Proof:** Supports organization switching for users with multiple memberships

**Technical Implementation:**
```tsx
// AppContext type with full organization context
export type AppContext = {
  session: Session | null;
  user: UserWithMemberships | null;
  currentOrganization: {
    id: string;
    name: string;
    type: string;
    role: string;
  } | null;
};
```

**Status:** ✅ Complete multi-tenant session architecture ready for role-based UI