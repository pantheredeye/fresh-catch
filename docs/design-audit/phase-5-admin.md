# Phase 5: Admin Pages

Biggest volume. Work file by file.

**Files:**
- `src/app/pages/admin/AdminDashboardUI.tsx`
- `src/app/pages/admin/Setup.tsx` (~10 issues)
- `src/app/pages/admin/MarketConfigUI.tsx`
- `src/app/pages/admin/AdminOrdersUI.tsx` (~15 issues)
- `src/app/pages/admin/admin.css` (~15 defensive fallbacks)
- `src/app/pages/admin/components/AdminOrderCard.tsx` (~25 issues)
- `src/app/pages/admin/components/CompactMarketCard.tsx` (~8 issues)
- `src/app/pages/admin/components/MarketFormModal.tsx` (~10 issues)

## admin.css - Defensive Fallback Pattern

This file uses a pattern of hardcoded hex THEN token override on next line. This is intentional for progressive enhancement but creates maintenance burden. Decision needed:

**Option A:** Remove hex fallbacks, trust token support (all modern browsers).
**Option B:** Keep as-is for safety.

Recommendation: Option A. Simplify.

Lines with this pattern: 65, 73, 121, 128, 139, 154, 176, 182, 201, 212, 219, 233, 235, 247

## Setup.tsx

### Undefined tokens
- [ ] Uses `var(--mint-green)`, `var(--sky-blue)`, `var(--soft-gray)` (blocked by Phase 0)

### Font sizes/weights
- [ ] Line 178: `fontSize: '28px'` -> `var(--font-size-3xl)`
- [ ] Line 179: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 189: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 265: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 305: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 306: `fontWeight: 500` -> `var(--font-weight-medium)`

### Spinner
- [ ] Lines 278-287: hardcoded spinner (same as Login/Join - extract component)

## AdminOrdersUI.tsx

### Font sizes/weights
- [ ] Line 83: `fontSize: '32px'` -> `var(--font-size-4xl)`
- [ ] Line 84: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 119: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 120: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 137, 163, 182: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 183: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 265: `fontSize: '32px'` -> `var(--font-size-4xl)`
- [ ] Line 266: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 274: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 275: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Hardcoded colors
- [ ] Line 135, 161: `border: '2px solid #e0e0e0'` -> `var(--input-border)`
- [ ] Line 179: `background: '#666'` -> `var(--cool-gray)`
- [ ] Line 221: `color="#e0f2fe"` -> `var(--sky-blue-light)`

### Spacing
- [ ] Lines 134, 160, 178: `padding: '10px 12px'` -> `var(--space-sm)`
- [ ] Line 278: `letterSpacing: '0.5px'` -> `var(--letter-spacing-wide)`

## AdminOrderCard.tsx

### Font sizes (many)
- [ ] Line 127: `fontSize: '20px'` -> `var(--font-size-xl)`
- [ ] Lines 233, 237, 244, 365: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Lines 281, 379, 441: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Lines 299, 456, 430: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 368: `fontSize: '24px'` -> `var(--font-size-2xl)`

### Font weights (many)
- [ ] Lines 127, 368: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Lines 233, 244, 270, 283, 300, 365, 381, 430, 441: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Spacing
- [ ] Lines 233, 244, 283, 365, 381: `marginBottom: '4px'` -> standardize

## CompactMarketCard.tsx

### Non-standard font sizes
- [ ] Line 64: `fontSize: '15px'` -> `var(--font-size-md)` (round 15->16)
- [ ] Line 76: `fontSize: '13px'` -> `var(--font-size-sm)` (round 13->14)
- [ ] Lines 98-101: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 129: `fontSize: '16px'` -> `var(--font-size-md)`

### Font weights
- [ ] Lines 65, 77: `fontWeight: 500` -> `var(--font-weight-medium)`

### Spacing
- [ ] Line 99: `marginTop: '2px'` -> minor, inline ok

## MarketFormModal.tsx

### Font sizes
- [ ] Line 151: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 167: `fontSize: '15px'` -> `var(--font-size-md)` (round up)
- [ ] Lines 253-257: `fontSize: '16px'` -> `var(--font-size-md)`

### Font weights
- [ ] Line 152: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Hardcoded input styles
- [ ] Line 163: `border: '2px solid #e0e0e0'` -> `var(--input-border)`
- [ ] Lines 161-170: input padding/sizing - should use TextInput component or match its tokens

### Letter spacing
- [ ] Line 155: `letterSpacing: '1px'` -> `var(--letter-spacing-wider)`
