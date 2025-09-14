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