# Phase 3: Home Components

**Files:**
- `src/app/pages/home/components/FreshHero.v2.tsx` (2 issues)
- `src/app/pages/home/components/MarketCard.tsx` (6 issues)
- `src/app/pages/home/components/BottomNavigation.v2.tsx` (15 issues)
- `src/app/pages/home/components/LiveBanner.tsx` (2 issues)
- `src/app/pages/home/components/NavItem.tsx` (5 issues)

## FreshHero.v2.tsx
- [ ] Line 49: `fontSize: '32px'` -> `var(--font-size-4xl)`
- [ ] Line 50: `fontWeight: 700` -> `var(--font-weight-bold)`

## MarketCard.tsx
- [ ] Line 41: `border: '1px solid rgba(0,102,204,0.08)'` -> `var(--border-subtle)`
- [ ] Line 76: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 77: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 84: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 100: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 100: `fontSize: '16px'` -> `var(--font-size-md)`

## BottomNavigation.v2.tsx
- [ ] Line 52: `border: '1px solid rgba(0,102,204,0.08)'` -> `var(--border-subtle)`
- [ ] Lines 64, 75: `borderBottom: '1px solid rgba(0,102,204,0.08)'` -> `var(--border-subtle)`
- [ ] Lines 62, 72, 92: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Lines 62, 72, 92: `fontWeight: 500` -> `var(--font-weight-medium)`
- [ ] Line 137: `fontSize: '13px'` -> `var(--font-size-sm)` (round up from 13)
- [ ] Line 137: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 154: `fontSize: '15px'` -> `var(--font-size-md)` (round up from 15)
- [ ] Line 154: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 171: `fontSize: '18px'` -> `var(--font-size-lg)`
- [ ] Line 171: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 177: `backdropFilter: 'blur(10px)'` -> `blur(var(--blur-md))`

## LiveBanner.tsx
- [ ] Line 24: `width/height: '8px'` - minor, inline ok for dot indicator
- [ ] Line 28: `boxShadow: '0 0 0 2px rgba(255,255,255,0.3)'` - consider token

## NavItem.tsx
- [ ] Line 20: `fontSize: '13px'` -> `var(--font-size-sm)`
- [ ] Line 20: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 25: inactive bg `'rgba(255,255,255,0.1)'` -> `var(--glass-subtle)`
- [ ] Line 26: inactive border `'rgba(255,255,255,0.2)'` -> `var(--glass-border-light)`
- [ ] Line 38: `fontSize: '10px'` -> `var(--font-size-xs)` (bumps 10->12, review visually)
