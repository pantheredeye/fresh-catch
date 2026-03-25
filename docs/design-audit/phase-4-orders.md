# Phase 4: Orders Pages

**Files:**
- `src/app/pages/orders/NewOrderUI.tsx` (~14 issues)
- `src/app/pages/orders/CustomerOrdersUI.tsx` (~3 issues)
- `src/app/pages/orders/components/OrderCard.tsx` (~20 issues)

## NewOrderUI.tsx

### Font sizes
- [ ] Line 87: `fontSize: '28px'` -> `var(--font-size-3xl)`
- [ ] Line 96: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 117: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 170: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 191: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 198: `fontSize: '12px'` -> `var(--font-size-xs)`

### Font weights
- [ ] Line 88: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 118: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Line 171: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Hardcoded colors
- [ ] Line 187: `border: '2px solid #e0e0e0'` -> `var(--input-border)`

### Letter spacing
- [ ] Lines 121, 174: `letterSpacing: '1px'` -> `var(--letter-spacing-wider)` (after Phase 0)

### Spacing
- [ ] Line 186: `padding: '12px 16px'` -> `var(--space-sm) var(--space-md)`
- [ ] Line 200: `marginTop: '4px'` -> small enough to leave inline

## CustomerOrdersUI.tsx
- [ ] Line 39: `fontSize: '32px'` -> `var(--font-size-4xl)`
- [ ] Line 40: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 62: `fontSize: '18px'` -> `var(--font-size-lg)`

## OrderCard.tsx

### Font sizes
- [ ] Line 96: `fontSize: '18px'` -> `var(--font-size-lg)`
- [ ] Line 105: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 114: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 175: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 191: `fontSize: '18px'` -> `var(--font-size-lg)`
- [ ] Line 205: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 221: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 239: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 257: `fontSize: '12px'` -> `var(--font-size-xs)`
- [ ] Line 278: `fontSize: '16px'` -> `var(--font-size-md)`

### Font weights
- [ ] Lines 96, 191: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Lines 106, 258: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Letter spacing
- [ ] Line 108: `letterSpacing: '0.5px'` -> `var(--letter-spacing-wide)`
- [ ] Line 261: `letterSpacing: '1px'` -> `var(--letter-spacing-wider)`

### Spacing
- [ ] Lines 179, 207: `marginBottom: '4px'` -> inline ok or `var(--space-xs)`
- [ ] Line 101: `padding: '4px 12px'` -> badge padding, standardize
- [ ] Line 273: `padding: '12px 16px'` -> `var(--space-sm) var(--space-md)`
