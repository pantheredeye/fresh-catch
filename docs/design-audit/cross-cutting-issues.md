# Cross-Cutting Issues

Patterns that appear across multiple pages. Fix these as reusable solutions.

## 1. Spinner Component (extract to design system)

Duplicated in 4+ files with identical inline styles (16px, 2px border, 50% radius, spin animation).

**Files:** Login.tsx, JoinUI.tsx, Setup.tsx, (possibly others)
**Action:** Create `src/design-system/components/Spinner.tsx`

## 2. Status Badge Pattern

Multiple pages build inline status badges with varying styles.
**Files:** OrderCard, AdminOrderCard, PrintOrders, AdminOrdersUI
**Action:** Standardize via Badge component variants or new StatusBadge

## 3. Section Header Pattern

`fontSize: '28px'` + `fontWeight: 700` repeated in ~4 pages as page titles.
**Action:** Already have SectionHeader in design system - verify pages use it

## 4. Non-Standard Font Sizes

`13px` and `15px` appear in several components. These don't exist in the token scale.
**Decision:** Round to nearest token (13->14=sm, 15->16=md) or add `--font-size-2xs: 10px` and keep scale clean.
**Recommendation:** Round. Don't expand the scale.

## 5. `#e0e0e0` Input Border

Hardcoded in 4+ files instead of `var(--input-border)`.
**Files:** AdminOrdersUI, MarketFormModal, NewOrderUI
**Action:** Global find/replace

## 6. Letter Spacing

`0.5px` and `1px` used in label/badge contexts across 6+ files.
**Action:** Add tokens in Phase 0, then replace

## 7. admin.css Defensive Fallbacks

Pattern of `color: #hex; color: var(--token);` throughout admin.css.
**Action:** Remove hex fallbacks, keep only token references. All target browsers support custom properties.

## 8. Missing `--radius-xs` Token

Design system jumps from 0 to `--radius-sm: 12px`. Several components need tighter radii (4-8px) for badges, tags, small elements.
**Action:** Add `--radius-xs: 6px` to tokens.css
