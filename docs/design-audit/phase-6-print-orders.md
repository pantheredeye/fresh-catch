# Phase 6: PrintOrders

**File:** `src/app/pages/admin/PrintOrdersUI.tsx` (~60 issues)

This page has ZERO token usage. Entirely hardcoded. It's a print-specific view, so some decisions needed:

## Decision: Print Styling Strategy

Print views often need specific styling for paper output. Options:
1. **Tokenize fully** - use same tokens, override in `@media print` if needed
2. **Separate print tokens** - create `--print-*` tokens for paper-specific values
3. **Leave as-is** - it's print-only, users won't see dark mode on paper

Recommendation: Option 1 for colors/fonts (consistency), accept some hardcoded print-specific layout values.

## Hardcoded Colors (15+ instances)

- [ ] Line 61: `background: '#f0f0f0'` -> `var(--light-gray)`
- [ ] Line 86: `background: '#666'` -> `var(--cool-gray)`
- [ ] Line 100: `borderBottom: '3px solid #000'` -> `var(--border-strong)` (Phase 0)
- [ ] Line 121, 175, 197, 216, 257: `color: '#666'` -> `var(--cool-gray)`
- [ ] Line 132: `color: '#999'` -> `var(--cool-gray)` or lighter variant
- [ ] Line 142: `border: '2px solid #000'` -> `var(--border-strong)`
- [ ] Line 159: `border: '3px solid #000'` -> `var(--border-strong)`
- [ ] Line 206: `background: '#f8f9fa'` -> `var(--light-gray)`
- [ ] Line 255: `borderTop: '2px solid #ccc'` -> `var(--border-medium)`

### Payment status badges (Bootstrap colors)
- [ ] Line 189: `background: '#d4edda'` / `'#fff3cd'` -> `var(--status-success-bg)` / `var(--status-warning-bg)`
- [ ] Line 190: `border: '#28a745'` / `'#ffc107'` -> `var(--status-success-border)` / `var(--status-warning-border)`

## Hardcoded Font Sizes (20+ instances)

- [ ] Line 75, 90, 191, 234: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 105: `fontSize: '28px'` -> `var(--font-size-3xl)`
- [ ] Line 112: `fontSize: '20px'` -> `var(--font-size-xl)`
- [ ] Line 119, 174, 184, 197, 257, 267: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 166: `fontSize: '20px'` -> `var(--font-size-xl)`
- [ ] Line 197: `fontSize: '12px'` -> `var(--font-size-xs)`

## Hardcoded Font Weights (10+ instances)
- [ ] Lines 76, 106, 167, 187: `fontWeight: 600` or `'bold'` -> tokens

## Hardcoded Spacing (20+ instances)
- [ ] Line 34: `padding: 20px` -> `var(--space-md)`
- [ ] Line 50: `max-width: 800px` -> `var(--width-md)`
- [ ] Lines 59, 101, 102, 145, 176, etc: various px -> space tokens

## Hardcoded Border Radius
- [ ] Lines 62, 74, 89, 143, 191, 208: mix of `4px`, `6px`, `8px` -> `var(--radius-sm)` (12px)
- NOTE: Print may want tighter radii. Consider `--radius-xs: 6px` token.
