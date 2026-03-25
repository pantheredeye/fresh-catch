# Customer Home Refactor - Real Data Integration

## Goal
Convert CustomerHome from mock data to real database data using RWSDK server component pattern.

## Pattern
**Server Component + Client Component**
- `CustomerHome.tsx` - Server component that fetches real market data
- `CustomerHomeUI.tsx` - Client component with all UI and interactivity

---

## Tasks

### ✅ Completed
- [x] Create Market model in Prisma schema
- [x] Generate migration for Market model
- [x] Create server functions for admin market CRUD
- [x] Create MarketConfigPage (admin) with real data
- [x] Create utility function for public organization context (`getPublicOrganizationId()`)
- [x] Create localStorage favorites hook (`useFavorites()`)
- [x] Document design decisions in DESIGN_DECISIONS.md

### 🔄 In Progress
- [ ] Convert CustomerHome.tsx to server component
- [ ] Create CustomerHomeUI.tsx client component

### 📋 Remaining

#### 1. Convert CustomerHome.tsx to Server Component
**File:** `src/app/pages/CustomerHome.tsx`

**Changes:**
```tsx
// Before: Regular function with mock data
export function CustomerHome({ ctx }: RequestInfo) {
  const MOCK_MARKETS = [...];
  return <div>...</div>
}

// After: Async server component that fetches real data
export async function CustomerHome({ ctx }: RequestInfo) {
  const orgId = getPublicOrganizationId();
  const markets = await db.market.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { name: "asc" }
  });

  return <CustomerHomeUI
    markets={markets}
    freshCatch={MOCK_FRESH_CATCH}
    quickActions={MOCK_QUICK_ACTIONS}
    ctx={ctx}
  />;
}
```

**Keep in file:**
- ✅ `MOCK_FRESH_CATCH` - Still used by FreshHero section
- ✅ `MOCK_QUICK_ACTIONS` - Still used by QuickActions section
- ✅ Import statements for types

**Remove from file:**
- ❌ `MOCK_MARKETS` - Replaced with real data
- ❌ `MOCK_USER` - Not needed for anonymous users
- ❌ All UI components (Header, LiveBanner, FreshHero, etc.) - Move to CustomerHomeUI

#### 2. Create CustomerHomeUI.tsx Client Component
**File:** `src/app/pages/CustomerHomeUI.tsx`

**Structure:**
```tsx
"use client";

import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import type { AppContext } from "@/worker";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
};

export function CustomerHomeUI({
  markets,
  freshCatch,
  quickActions,
  ctx
}: {
  markets: Market[];
  freshCatch: { emoji: string; name: string }[];
  quickActions: { icon: string; title: string; href: string }[];
  ctx: AppContext;
}) {
  const [favorites, toggleFavorite] = useFavorites();

  // Filter markets into favorites and all
  const favoriteMarkets = markets.filter(m => favorites.includes(m.id));
  const allMarkets = markets;

  return (
    <div style={{...}}>
      {/* Background */}
      <div style={{...}} />

      {/* Header */}
      <Header />

      {/* Live Banner */}
      <LiveBanner />

      {/* Fresh Hero Section */}
      <FreshHero freshCatch={freshCatch} />

      {/* Markets Section - TWO SECTIONS */}
      {favoriteMarkets.length > 0 && (
        <YourMarketsSection
          markets={favoriteMarkets}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      <AllMarketsSection
        markets={allMarkets}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

// Move all component functions here:
// - Header
// - LiveBanner
// - FreshHero
// - YourMarketsSection (NEW)
// - AllMarketsSection (NEW)
// - QuickActions
// - BottomNavigation
```

#### 3. Update MarketsSection Component
**Current:** Single `MarketsSection` component with mock data
**New:** Two sections with real data

**YourMarketsSection:**
- Title: "Your Markets" with count
- Shows only favorited markets
- Heart icon filled
- Prominent styling

**AllMarketsSection:**
- Title: "All Markets" with count
- Shows all active markets
- Heart icon toggleable (empty/filled based on favorites)
- Slightly muted styling vs "Your Markets"

**Market Card Updates:**
```tsx
// Old mock data structure
{
  id: "oxford-city",
  name: "Oxford City Market",
  date: "Tuesday, November 5",      // ❌ Remove
  time: "3:00 PM - 6:30 PM",        // ❌ Remove
  status: "3 days away",            // ❌ Remove
  isFavorite: true,                 // ❌ Remove (use favorites array)
  isLive: false                     // ❌ Remove
}

// New real data structure
{
  id: "uuid-here",
  name: "Oxford City Market",
  schedule: "Tue 3-6:30",          // ✅ Simple schedule string
  subtitle: null,                   // ✅ Optional (e.g., "Paused until March")
  active: true,                     // ✅ (filtered server-side)
  isFavorite: favorites.includes(id) // ✅ Derived from favorites array
}
```

#### 4. Test & Verify
- [ ] Markets display correctly with real data
- [ ] Favorites toggle works (localStorage)
- [ ] "Your Markets" section only shows when favorites exist
- [ ] "All Markets" section always shows
- [ ] Empty state handling (no markets in database)
- [ ] Schedule displays correctly ("Sat 8-2" format)
- [ ] Subtitle displays when present
- [ ] Admin mode still accessible

---

## Data Flow

```
┌─────────────────────────────────────────┐
│ Database (Prisma)                       │
│ Market { id, name, schedule, subtitle } │
└────────────┬────────────────────────────┘
             │
             │ Server Component fetches
             ↓
┌─────────────────────────────────────────┐
│ CustomerHome.tsx (Server)               │
│ - Fetches active markets from DB        │
│ - Gets org ID from getPublicOrganizationId() │
└────────────┬────────────────────────────┘
             │
             │ Pass as props
             ↓
┌─────────────────────────────────────────┐
│ CustomerHomeUI.tsx (Client)             │
│ - Receives markets array                │
│ - Uses useFavorites() hook              │
│ - Filters into favorite/all sections    │
│ - Renders two market sections           │
└─────────────────────────────────────────┘
             │
             │ User clicks heart
             ↓
┌─────────────────────────────────────────┐
│ localStorage                            │
│ fresh-catch-favorites: ["id1", "id2"]   │
└─────────────────────────────────────────┘
```

---

## Future Enhancements (Phase 2+)
- [ ] Date calculations ("3 days away" status)
- [ ] Live indicator (manual toggle or time-based)
- [ ] Sync favorites to database after user login
- [ ] Migration function: localStorage → DB on account creation
- [ ] Location/address fields on Market model
- [ ] Map integration
- [ ] Market search/filter

---

## Files Involved

**New Files:**
- `src/app/pages/CustomerHomeUI.tsx` - Client component with UI
- `src/utils/organization.ts` - Organization context helper
- `src/hooks/useFavorites.ts` - localStorage favorites hook
- `CUSTOMER_HOME_REFACTOR_TODO.md` - This file

**Modified Files:**
- `src/app/pages/CustomerHome.tsx` - Convert to server component
- `prisma/schema.prisma` - Already has Market model
- `DESIGN_DECISIONS.md` - Documented approach

**Related Files (for reference):**
- `src/app/pages/admin/MarketConfigPage.tsx` - Example of same pattern
- `src/app/pages/admin/MarketConfigUI.tsx` - Example client component
- `src/app/pages/admin/market-functions.ts` - Example server functions
- `.cursor/rules/rwsdk_rwsdk-react.mdc` - RWSDK patterns reference

---

**Last Updated:** 2025-01-04
**Status:** In Progress - Step 1 (Convert CustomerHome.tsx)
