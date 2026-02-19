# Figma Design System Workflow

## Overview

This workflow lets you audit and fix design issues visually in Figma, then implement fixes in code. Perfect for finding inconsistencies across your app.

## Setup (One Time)

### 1. Install Figma Plugin
1. Open Figma
2. Go to Resources → Plugins → Browse
3. Search "Tokens Studio for Figma"
4. Install plugin

### 2. Import Your Tokens
1. In Figma, open/create your design file
2. Run Tokens Studio plugin (Resources → Plugins → Tokens Studio)
3. Settings (gear icon) → Import → Load from JSON
4. Copy/paste contents of `src/design-system/tokens-three-tier.json`
5. Click "Import"

### 3. Sync to Figma Variables
1. In Tokens Studio plugin → Settings
2. Click "Sync to Figma Variables"
3. Select all token sets (brand, alias, component, dark)
4. Click "Sync"

**Result**: You now have Figma variables matching your code tokens!

## Token Structure (Three-Tier)

### Brand (Primitives) - Never Change These
```
blue-500: #0066CC
spacing-3: 20px
fontSize-md: 16px
```
Raw values. Platform agnostic.

### Alias (Semantic) - Named by Purpose
```
color-action-primary: {brand.blue-500}
spacing-md: {brand.spacing-3}
fontSize-body-md: {brand.fontSize-md}
```
References brand. Swap these for themes.

### Component (Applied) - Specific UI Context
```
button-primary-background: {alias.color-action-primary}
button-primary-padding-x: {alias.spacing-md}
input-fontSize: {alias.fontSize-body-md}
```
Applied to actual components.

## Visual Audit Workflow

### Phase 1: Build Component Library (In Figma)

1. **Create Frame**: "Design System / Buttons"
2. **Build Button Component**:
   - Draw rectangle
   - Apply tokens:
     - Fill: `component/button/primary/background`
     - Padding: `component/button/primary/padding-x`
     - Corner radius: `component/button/primary/borderRadius`
     - Text size: `component/button/primary/fontSize`
3. **Create Component** (⌥⌘K / Alt+Ctrl+K)
4. **Repeat for all components** from inventory:
   - Buttons (primary, secondary, ghost, outline)
   - Inputs (text, select, textarea, toggle)
   - Cards (standard, favorite, compact)
   - Badges (fresh, favorite, status)
   - Navigation elements
   - Modals
   - Admin components

### Phase 2: Build Actual Screens

1. **Create Admin Dashboard Screen**:
   - Use your component instances
   - Apply page tokens: `component/page/background`
   - Layout with `alias/spacing/*` tokens
2. **Create Customer Home Screen**
3. **Create Order Screens**
4. **Toggle Dark Mode**:
   - In Figma: Right panel → Variables → Change to "Dark Mode" theme
   - See what breaks!

### Phase 3: Document Issues

As you build, you'll find:

**Missing Tokens**:
- "I need a brown color for admin button" → Add to brand
- "No token for soft gray" → Add `gray-200` to brand

**Inconsistencies**:
- "Admin card uses different padding than customer card"
- "Modal border radius doesn't match cards"

**Dark Mode Breaks**:
- "White background disappears in dark mode"
- "Border invisible in dark mode"

**Wrong Mappings**:
- "Button using wrong font size"
- "Card using page padding instead of card padding"

### Phase 4: Fix in JSON, Re-Import

1. **Edit** `tokens-three-tier.json`
2. **Add missing tokens**:
   ```json
   "brown": {
     "600": { "value": "#856404", "type": "color" }
   }
   ```
3. **Re-import to Figma** (same steps as setup)
4. **Components update automatically!**

### Phase 5: Fix in Code

From Figma, you now know:
1. **What's broken** (visual proof)
2. **What token to use** (from Figma applied tokens)
3. **Exact values** (from three-tier system)

Example fix:
```tsx
// ❌ Before (from inventory)
style={{ background: 'white' }}

// ✅ After (from Figma audit)
style={{ background: 'var(--surface-primary)' }}
```

## Practical Example

### Example: Fix Admin Market Form Modal

**From Inventory**:
```
MarketFormModal.tsx - MANY HARDCODED VALUES
- background: 'var(--warm-white)' (dark mode breaks)
- border: '2px solid #e0e0e0' (hardcoded)
- fontSize hardcoded (20px, 12px, 15px)
```

**Figma Audit**:
1. Build modal component in Figma
2. Apply tokens:
   - Background: `component/modal/content-background` (= white in light, dark-surface in dark)
   - Border: `alias/color/border/input` (= #E8EFF5 in light, green-tint in dark)
   - Title: `alias/fontSize/heading-md` (= 24px)
   - Body: `alias/fontSize/body-md` (= 16px)
   - Label: `alias/fontSize/label` (= 14px)
3. Toggle dark mode → see it works!
4. Screenshot for reference

**Code Fix** (with Figma reference):
```tsx
// Modal container
style={{
  background: 'var(--surface-primary)', // Not --warm-white
  border: '2px solid var(--input-border)', // Not #e0e0e0
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-xl)',
  boxShadow: 'var(--shadow-lg)',
}}

// Modal title
style={{
  fontSize: 'var(--font-size-2xl)', // 24px = heading-md
  fontWeight: 'var(--font-weight-bold)',
  color: 'var(--text-primary)',
}}

// Input labels
style={{
  fontSize: 'var(--font-size-sm)', // 14px = label
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--text-primary)',
}}
```

## Token Usage Patterns

### Colors - Always Context-Aware
```tsx
// ❌ Wrong
background: 'white'           // Breaks dark mode
background: '#1A2B3D'         // Hardcoded
background: 'var(--warm-white)' // Light-mode specific

// ✅ Right
background: 'var(--surface-primary)'  // Auto-adapts
color: 'var(--text-primary)'          // Auto-adapts
border: 'var(--border-light)'         // Auto-adapts
```

### Spacing - Use Scale
```tsx
// ❌ Wrong
padding: '20px'
gap: '12px'

// ✅ Right
padding: 'var(--space-md)'  // 20px
gap: 'var(--space-sm)'      // 12px
```

### Typography - Semantic Names
```tsx
// ❌ Wrong
fontSize: '16px'
fontSize: 'var(--font-size-md)' // Too primitive

// ✅ Right
fontSize: 'var(--font-size-body-md)' // Semantic
// Or use utility class: className="body-md"
```

## Missing Tokens to Add

Based on inventory audit, add these to `tokens-three-tier.json`:

### Brand Layer
```json
"brown": {
  "600": { "value": "#856404", "type": "color" }
},
"green": {
  "400": { "value": "#4CAF50", "type": "color" }
},
"sky": {
  "100": { "value": "#e0f2fe", "type": "color" }
}
```

### Alias Layer
```json
"admin-secondary": { "value": "{brand.color.brown.600}", "type": "color" },
"toggle-active": { "value": "{brand.color.green.400}", "type": "color" },
"status-pending-bg": { "value": "{brand.color.sky.100}", "type": "color" }
```

### Component Layer
```json
"button": {
  "secondary-admin": {
    "background": { "value": "{alias.color.admin-secondary}", "type": "color" }
  }
},
"toggle": {
  "active": { "value": "{alias.color.toggle-active}", "type": "color" },
  "inactive": { "value": "{alias.surface.secondary}", "type": "color" }
}
```

## Benefits of This Workflow

### 1. Visual Truth
See all components side-by-side. Spot inconsistencies instantly.

### 2. Dark Mode Confidence
Toggle theme in Figma before writing code. No surprises.

### 3. Design-Dev Parity
Same token names in Figma and CSS. Designer says "use button-primary-background", you know exactly what that is.

### 4. Rapid Iteration
Change `brand.blue-500` in JSON, re-import, ALL components update.

### 5. Multi-App Consistency
Export tokens from one app, import to another. Instant brand consistency.

### 6. Handoff Documentation
Screenshot Figma with applied tokens = perfect spec for devs.

## Next Steps

1. **Import tokens to Figma** (5 min)
2. **Build 3 components** (Button, Input, Card) (20 min)
3. **Build 1 screen** (Home or Admin) (30 min)
4. **Toggle dark mode** → Document what breaks
5. **Fix 1 component in code** from Figma reference
6. **Repeat** for all components from inventory

## Quick Reference

**Component Inventory**: See agent output above for all components and issues
**Token JSON**: `src/design-system/tokens-three-tier.json`
**Current Tokens CSS**: `src/design-system/tokens.css`

**Priority Fixes** (from inventory):
1. ❌ Undefined tokens: `--soft-gray`, `--surface-secondary`, `--sky-blue`
2. ❌ Dark mode white backgrounds: admin.css, modals, forms
3. ❌ Hardcoded borders: `rgba(100, 116, 139, 0.1)` everywhere
4. ⚠️ Hardcoded spacing/typography: almost every component
