# Admin Navigation Enhancement - Planning & Todo

## Goal
Create intuitive admin navigation so Evan doesn't need to remember specific URLs like `/admin/config`. Provide clear entry points and persistent navigation for admin workflows.

## Design Philosophy
- **Primary Entry Point**: `/admin` - Single URL for Evan to bookmark
- **Smart Routing**: Detect login state and guide to appropriate page
- **Persistent Navigation**: Admin can access tools from anywhere once logged in
- **Customer View Toggle**: Evan can see what customers see without logging out

---

## Phase 1: Admin Landing Page (`/admin` route)

**STATUS:** ✅ COMPLETE (2025-10-11)

### Goals - ALL ACHIEVED ✅
- ✅ Single memorable URL for admin access (`/admin`)
- ✅ Smart routing based on authentication state
- ✅ Navigation hub for all admin functions
- ✅ Foundation for Phase 2 header integration

### User Flow - IMPLEMENTED ✅
```
/admin
  ├─ Not logged in → Show inline login form (Login component)
  ├─ Logged in but not admin → Access denied error page
  └─ Logged in as admin → Admin dashboard with navigation cards
```

### Implementation Summary
- **Design Pattern:** Defensive CSS (admin-auth.css) for system theme override protection
- **Layout:** Card grid - 1 column mobile, 2 columns desktop
- **Cards:** Big button-style navigation (120px height minimum)
- **Error Handling:** Consistent styled error pages for all states
- **Files Created:** AdminDashboard.tsx, AdminDashboardUI.tsx
- **Routes Updated:** Added `/admin` landing route to admin routes

### Tasks

#### 1. Create Admin Dashboard Page
**File:** `src/app/pages/admin/AdminDashboard.tsx`

**Server Component Structure:**
```tsx
export async function AdminDashboard({ ctx }: RequestInfo) {
  // Check authentication state
  if (!ctx.user) {
    return <AdminLoginPrompt />;
  }

  if (!hasAdminAccess(ctx)) {
    return <AccessDenied />;
  }

  // Fetch stats for dashboard (optional)
  const marketCount = await db.market.count({
    where: { organizationId: ctx.currentOrganization.id }
  });

  return <AdminDashboardUI marketCount={marketCount} ctx={ctx} />;
}
```

#### 2. Design Admin Dashboard UI
**File:** `src/app/pages/admin/AdminDashboardUI.tsx`

**Design Considerations:**
- [ ] Use existing glassmorphism pattern for consistency
- [ ] Large, tappable navigation cards (mobile-first)
- [ ] Visual hierarchy: Primary actions larger than secondary
- [ ] Status indicators (e.g., "3 active markets")
- [ ] Use admin color palette (coral gradient for primary actions)

**Layout Options to Consider:**

**Option A: Card Grid** (Recommended for mobile)
```
┌─────────────────────────────────┐
│         Admin Dashboard         │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  📍 Market Configuration  │  │
│  │  Manage your 9 markets    │  │
│  │  → 3 active markets       │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  📅 Schedule Management   │  │
│  │  Cancel/add special days  │  │
│  │  → Coming soon            │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  👁️ View as Customer       │  │
│  │  See what customers see   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Option B: Quick Action Bar + Cards**
```
┌─────────────────────────────────┐
│  Admin Dashboard                │
│  [⚙️ Config] [📅 Schedule] [👁️]  │
├─────────────────────────────────┤
│  Quick Stats                    │
│  • 3 active markets             │
│  • Next market: Sat 8am         │
│  • Last updated: 2 hours ago    │
└─────────────────────────────────┘
```

**UI Component Structure:**
```tsx
"use client";

export function AdminDashboardUI({ marketCount, ctx }) {
  return (
    <Container>
      <Header>
        <h1>Admin Dashboard</h1>
        <Badge>Owner</Badge>
      </Header>

      {/* Navigation Cards */}
      <NavGrid>
        <AdminNavCard
          icon="📍"
          title="Market Configuration"
          description="Manage your market locations"
          href="/admin/config"
          status={`${marketCount} markets`}
          variant="primary"
        />

        <AdminNavCard
          icon="📅"
          title="Schedule Management"
          description="Daily operations & special events"
          href="/admin/schedule"
          status="Coming soon"
          variant="secondary"
          disabled
        />

        <AdminNavCard
          icon="👁️"
          title="View as Customer"
          description="See what customers see"
          href="/"
          variant="tertiary"
        />
      </NavGrid>

      {/* Quick Stats (optional) */}
      <QuickStats marketCount={marketCount} />
    </Container>
  );
}
```

**Design Token Usage:**
- Primary cards: `var(--coral-gradient)` for admin actions
- Secondary cards: `var(--glass-white)` with `var(--ocean-blue)` border
- Status badges: `var(--mint-fresh)` for active, `var(--cool-gray)` for inactive
- Spacing: `var(--space-lg)` between cards
- Card radius: `var(--radius-xl)` for prominent cards

#### 3. Create AdminLoginPrompt Component
**Considerations:**
- [ ] Show branded login specific to admin flow
- [ ] Clear messaging: "Admin Login Required"
- [ ] Link to setup if no admin exists: "First time? Set up admin account"
- [ ] Use existing LoginForm component with admin context

```tsx
function AdminLoginPrompt() {
  return (
    <Container>
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <h1>Admin Access</h1>
        <p>Please log in to access admin tools</p>

        <LoginForm redirectTo="/admin" />

        <a href="/admin/setup">First time? Set up admin account →</a>
      </div>
    </Container>
  );
}
```

#### 4. Create AccessDenied Component
**Considerations:**
- [ ] Friendly error message
- [ ] Suggest customer portal link
- [ ] Contact admin option (for future multi-admin scenario)

```tsx
function AccessDenied() {
  return (
    <Container>
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '64px' }}>🔒</div>
        <h1>Admin Access Required</h1>
        <p>You don't have permission to access admin tools.</p>
        <a href="/">← Back to Customer Portal</a>
      </div>
    </Container>
  );
}
```

#### 5. Add `/admin` Route
**File:** `src/app/pages/admin/routes.ts`

```tsx
export const adminRoutes = [
  route("/", AdminDashboard),        // NEW: /admin landing
  route("/setup", SetupPage),        // /admin/setup
  route("/config", MarketConfigPage), // /admin/config
];
```

#### 6. Update Setup Page Redirect
**File:** `src/app/pages/admin/Setup.tsx`

After successful admin setup, redirect to `/admin` instead of `/admin/config`:
```tsx
// In handleFinish after successful registration
window.location.href = "/admin"; // Changed from /admin/config
```

### Testing Checklist - Phase 1
- ✅ `/admin` shows inline login when not authenticated
- ✅ `/admin` shows dashboard when logged in as admin
- ✅ `/admin` shows access denied when logged in as non-admin
- ✅ Navigation cards link to correct admin pages (Markets, View Site)
- ✅ "View as Customer" navigates to `/` (customer home)
- ✅ Setup page redirects to `/admin` after completion
- ✅ Defensive CSS consistent across all auth/admin pages
- ✅ Mobile-responsive layout works (cards stack properly)
- ✅ MarketConfigPage has enhanced error handling (not logged in, not admin, no org)

---

## Phase 2: Header Admin Navigation (Enhancement)

### Goals
- Persistent admin access from any page
- "View as Customer" mode for Evan
- Minimal UI footprint when in customer view
- Quick access to common admin tasks

### Design Considerations

**Option A: Admin Badge + Dropdown**
```
┌─────────────────────────────────┐
│  Evan's Fresh Catch    [ADMIN ▼]│  ← Badge in header
│                                 │
│  Dropdown when clicked:         │
│  ┌─────────────────────────┐   │
│  │ 📍 Market Config        │   │
│  │ 📅 Schedule             │   │
│  │ 👁️ View as Customer     │   │
│  │ ─────────────────────   │   │
│  │ 🚪 Logout               │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Option B: Floating Admin Button** (Recommended)
```
┌─────────────────────────────────┐
│  Evan's Fresh Catch    + Order  │
│                                 │
│  [Customer content here]        │
│                                 │
│                          [⚙️]   │  ← Floating admin button
│                                 │
│  [Bottom Nav]                   │
└─────────────────────────────────┘

Tap ⚙️ → Opens admin menu overlay
```

**Option C: Mode Toggle**
```
┌─────────────────────────────────┐
│  Evan's Fresh Catch             │
│  [Customer] [ADMIN] ← Toggle    │
│                                 │
│  Shows admin bar when ADMIN on: │
│  [📍 Config] [📅 Schedule] [👁️] │
└─────────────────────────────────┘
```

### Tasks - Phase 2

#### 1. Design Decision: Choose Header Pattern
- [ ] Review Option A (Badge + Dropdown)
- [ ] Review Option B (Floating Button)
- [ ] Review Option C (Mode Toggle)
- [ ] Consider mobile UX (thumb reach, tap targets)
- [ ] Consider customer experience (minimal distraction)
- [ ] Decide and document in DESIGN_DECISIONS.md

#### 2. Implement Chosen Pattern
**File:** `src/app/pages/CustomerHomeUI.tsx`

Update Header component to include admin navigation:
```tsx
function Header({ ctx }: { ctx: AppContext }) {
  const isAdmin = hasAdminAccess(ctx);

  return (
    <header>
      {/* Existing header content */}

      {/* Admin navigation - chosen pattern */}
      {isAdmin && <AdminHeaderNav />}
    </header>
  );
}
```

#### 3. Create AdminHeaderNav Component
**Pattern-specific implementation based on Phase 2.1 decision**

**Shared Behavior:**
- [ ] Show only when user is admin
- [ ] Provide quick links to `/admin/config`, `/admin/schedule`
- [ ] "View as Customer" hides admin UI (localStorage flag?)
- [ ] Persistent across page navigation
- [ ] Accessible on mobile (44px min tap target)

#### 4. Add "View Mode" State Management
**Consideration:** How to toggle between admin and customer view?

**Option A: URL Parameter**
```tsx
// Customer view: /?mode=customer
// Admin view: / (default for admin users)
```

**Option B: localStorage**
```tsx
const [viewMode, setViewMode] = useState(
  localStorage.getItem('admin-view-mode') || 'admin'
);
```

**Option C: Session/Cookie** (Most robust)
```tsx
// Server function to toggle view mode in session
```

#### 5. Update All Page Headers
- [ ] CustomerHomeUI.tsx - Add admin nav
- [ ] Future pages - Ensure admin nav present
- [ ] Create shared AdminHeaderNav component in admin-design-system

### Testing Checklist - Phase 2
- [ ] Admin badge/button visible when logged in as admin
- [ ] Admin badge/button hidden when logged in as customer
- [ ] Admin badge/button hidden when not logged in
- [ ] Dropdown/menu opens on tap/click
- [ ] Quick links navigate correctly
- [ ] "View as Customer" hides admin UI
- [ ] "View as Customer" persists across navigation
- [ ] Mobile tap targets are 44px+ (accessibility)
- [ ] Admin nav doesn't interfere with customer experience
- [ ] Design consistent with existing glassmorphism pattern

---

## Design System Components to Create

### AdminNavCard
```tsx
interface AdminNavCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  status?: string;
  variant: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
}
```

### AdminHeaderNav
```tsx
interface AdminHeaderNavProps {
  ctx: AppContext;
  currentPath?: string;
}
```

### AdminBadge
```tsx
interface AdminBadgeProps {
  role: 'owner' | 'manager'; // For future multi-admin
  size?: 'sm' | 'md';
}
```

---

## Future Enhancements (Phase 3+)
- [ ] Admin dashboard stats (active markets, upcoming events, orders)
- [ ] Quick actions on dashboard (Cancel today's market, Add special event)
- [ ] Keyboard shortcuts for power users (Cmd+K for admin menu)
- [ ] Mobile app-like install prompt for Evan (PWA)
- [ ] "Recently used" admin actions
- [ ] Notification badge for pending admin tasks

---

## Files Involved

**New Files:**
- `src/app/pages/admin/AdminDashboard.tsx` - Server component
- `src/app/pages/admin/AdminDashboardUI.tsx` - Client component
- `src/admin-design-system/AdminNavCard.tsx` - Navigation card component
- `src/admin-design-system/AdminHeaderNav.tsx` - Header navigation (Phase 2)

**Modified Files:**
- `src/app/pages/admin/routes.ts` - Add `/admin` route
- `src/app/pages/admin/Setup.tsx` - Update redirect after setup
- `src/app/pages/CustomerHomeUI.tsx` - Add admin header nav (Phase 2)

**Design Files:**
- `DESIGN_DECISIONS.md` - Document admin navigation pattern choice
- `ADMIN_NAVIGATION_TODO.md` - This file

---

## Decision Log

### Admin Dashboard Layout (DECIDED - 2025-10-11)
**Question:** Card grid vs Quick action bar?
**Considerations:**
- Mobile-first (Evan will use phone)
- Easy tap targets for older user
- Visual clarity
- Extensibility for future features

**Decision:** ✅ Card Grid (Option A) with Big Button Style
**Rationale:**
- Industrial design principles - form follows function
- Big buttons eliminate ambiguity about clickability
- Equal visual weight for current priorities
- Grows naturally from 2 → 4 → 6 cards as features added
- Minimum 120px tap targets for accessibility
- Defensive CSS pattern for theme consistency

### Header Navigation Pattern (Pending - Phase 2)
**Question:** Badge dropdown vs Floating button vs Mode toggle?
**Considerations:**
- Minimal distraction in customer view
- Easy access for Evan
- Mobile thumb reach
- Visual consistency

**Decision:** TBD - Will decide when implementing Phase 2

⚠️ **Note for Phase 2:** Consider whether persistent header nav is needed since `/admin` dashboard provides clear navigation. May be overkill for simple two-page admin section (Markets + future Inventory/Orders).

---

**Last Updated:** 2025-10-11
**Current Phase:** Phase 1 Complete ✅ | Phase 2 Pending 🟡
**Next Step:** Launch with current Phase 1 implementation, revisit Phase 2 after user feedback
