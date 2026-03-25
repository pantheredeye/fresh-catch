# Phase 2: Login + JoinUI

**Files:**
- `src/app/pages/user/Login.tsx` (~12 issues)
- `src/app/pages/user/JoinUI.tsx` (~13 issues)
- `src/design-system/components/LoginForm.tsx` (~19 issues)

## Login.tsx

### Undefined tokens (blocked by Phase 0)
- [ ] Line 195: `var(--mint-green)` in getStatusColor()
- [ ] Line 197: `var(--sky-blue)` in getStatusColor()
- [ ] Line 198: `var(--soft-gray)` in getStatusColor()
- [ ] Line 253: `var(--sky-blue)` link color

### Hardcoded font sizes
- [ ] Line 217: `fontSize: '28px'` -> `var(--font-size-3xl)`
- [ ] Line 231: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 255, 262, 353, 383, 401, 441: `fontSize: '14px'` -> `var(--font-size-sm)`

### Hardcoded font weights
- [ ] Line 218: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 442: `fontWeight: 500` -> `var(--font-weight-medium)`

### Hardcoded colors
- [ ] Line 339, 369: `borderTop: '1px solid rgba(100, 116, 139, 0.1)'` -> `var(--border-subtle)`

### Spinner (shared pattern - extract component?)
- [ ] Lines 415-419: hardcoded 16px/2px spinner - consider shared Spinner component

## JoinUI.tsx

### Undefined tokens (blocked by Phase 0)
- [ ] Lines 98, 349: `var(--mint-green)`
- [ ] Lines 100, 351: `var(--sky-blue)`
- [ ] Lines 101, 352: `var(--soft-gray)`

### Hardcoded font sizes
- [ ] Lines 126, 192, 232, 377, 408, 448: `fontSize: '14px'` -> `var(--font-size-sm)`

### Hardcoded font weights
- [ ] Lines 127, 378: `fontWeight: 600` -> `var(--font-weight-semibold)`
- [ ] Lines 233, 449: `fontWeight: 500` -> `var(--font-weight-medium)`

### Hardcoded spacing
- [ ] Lines 123, 374: `padding: '6px 14px'` -> `var(--space-xs) var(--space-sm)`

### Spinner (same pattern as Login)
- [ ] Lines 206-210, 422-426: hardcoded spinner

## LoginForm.tsx (design system component)

### Hardcoded font sizes
- [ ] Line 230: `fontSize: '28px'` -> `var(--font-size-3xl)`
- [ ] Line 238: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 257: `fontSize: '14px'` -> `var(--font-size-sm)`
- [ ] Line 266: `fontSize: '16px'` -> `var(--font-size-md)`
- [ ] Line 308, 327, 341: `fontSize: '14px'` -> `var(--font-size-sm)`

### Hardcoded font weights
- [ ] Line 231: `fontWeight: 700` -> `var(--font-weight-bold)`
- [ ] Line 241: `fontWeight: 400` -> `var(--font-weight-normal)`
- [ ] Line 258: `fontWeight: 600` -> `var(--font-weight-semibold)`

### Hardcoded colors/shadows
- [ ] Line 221: `boxShadow: '0 20px 40px rgba(...)'` -> `var(--shadow-lg)`
- [ ] Line 336: `background: 'rgba(255, 107, 107, 0.1)'` -> semantic error token
- [ ] Line 337: `border: '1px solid rgba(255, 107, 107, 0.3)'` -> semantic error token

### Hardcoded blur
- [ ] Line 215: `backdropFilter: 'blur(10px)'` -> `blur(var(--blur-md))`
- [ ] Line 271: `backdropFilter: 'blur(5px)'` -> `blur(var(--blur-sm))`

### Micro-spacing
- [ ] Lines 295, 301: `2px` gap/margin - decide: use `var(--space-xs)` (8px) or accept inline
