# Design Patterns - Modern Fresh System

## Design Evolution Context

This system evolved from "Market Fresh Hybrid" - balancing authentic seafood market character with Instagram-ready modern appeal for broader demographics. Key principle: **Vibrant but Natural**.

## Core Design Principles

### Visual Character
- **Instagram-Ready**: Bold gradients, glassmorphism, colorful shadows
- **Market Authentic**: Hand-drawn elements, torn edges, handwriting accents
- **Premium Feel**: Generous spacing, quality materials, confident borders

### Information Hierarchy (Maintained Across All Variants)
1. **Fish/Fresh Catch** (Primary hero)
2. **Markets** (Core functionality)
3. **Quick Actions** (Secondary utilities)
4. **Navigation** (Always accessible)

## Mobile-First Strategy

### The Problem We're Solving
Previous conversions created "fake phone containers" - HTML that simulated mobile view rather than truly responsive design.

### Our Approach: Natural Responsive
```css
.container {
  max-width: 500px;        /* WHY: Perfect for mobile-first, readable on desktop */
  margin: 0 auto;          /* WHY: Centers content naturally */
  padding: var(--space-md); /* WHY: Breathing room on all sides */
  /* NO artificial phone boundaries */
}
```

### Layout Principles
1. **Content flows naturally** - no artificial constraints
2. **Generous spacing** - premium feel, photographs well
3. **Touch-friendly targets** - minimum 44px tap areas
4. **Floating elements** - navigation, headers feel modern

## Component Patterns

### Headers - Floating and Confident
**WHY**: Sticky headers with glassmorphism feel modern and premium. Quick actions in header = immediate access to core functionality.

### Cards - Elevated with Character
**WHY**: Glassmorphism + colored shadows = premium feel. Torn-paper edges add market authenticity without looking amateur.

### Fresh Badges - Energy and Movement
**WHY**: "Fresh" indicators need energy. Subtle bounce animation + seafoam color = excitement about fresh catch.

### Input System - Context-Aware Styling
**WHY**: Inputs adapt to context - glass effects on auth pages, warm backgrounds on standard forms. Consistent focus states with ocean blue create brand recognition.

#### Form Input Patterns
- **Standard Context**: Warm white backgrounds, subtle borders, ocean blue focus
- **Auth Context**: Glass effect with backdrop blur over gradients
- **Inline Context**: Compact styling that fits within text flows
- **Toggle Context**: iOS-style switches for settings and status

#### Input Hierarchy
1. **Primary Inputs**: TextInput, Textarea - core data entry
2. **Specialized Inputs**: TimeInput, TimeRow - domain-specific
3. **Selection Controls**: Select, RadioGroup - choice-making
4. **State Controls**: ToggleSwitch - on/off settings

### Typography Hierarchy
**WHY**: Mixed typography adds market character while staying readable.

- **Headers**: DM Sans (clean but not excessive)
- **Body**: System fonts (familiar, fast loading)
- **Prices/Times**: Monospace (trustworthy, market-like)
- **Special Notes**: Handwriting font (Evan's personal touch)

## Color Psychology & Usage

### Ocean Theme (Trust & Freshness) → `--color-action-primary`
- **Primary**: Ocean gradient - trustworthy, clean water association
- **Usage**: Main CTAs, branding, primary navigation

### Coral/Salmon (Appetite & Warmth) → `--color-action-secondary`
- **Secondary**: Coral gradient - warm, appetizing, alert color
- **Usage**: Secondary actions, alerts, warm accents

### Mint Fresh (Energy & Success) → `--color-status-success`
- **Accent**: Seafoam green - fresh, energetic, success states
- **Usage**: "Fresh" badges, success messages, availability indicators

### Warm Gold (Premium & Special) → `--color-accent-gold`
- **Premium**: Market gold - special items, favorites
- **Usage**: Star ratings, premium items, special offers

## Animation Guidelines

### Subtle and Purposeful
- **Fresh badges**: Gentle bounce (excitement)
- **Cards**: Lift on hover (premium feel)
- **CTAs**: Scale on tap (feedback)
- **NO**: Excessive animations, spinning elements, auto-playing content

### Performance First
- Use CSS transforms (GPU accelerated)
- Respect `prefers-reduced-motion`
- Keep animations under 300ms for interactions

## Implementation Status

### ✅ Completed Components
- **Input System**: TextInput, Textarea, TimeInput, TimeRow, Select, InlineSelect, RadioGroup, ToggleSwitch
- **Buttons**: Primary, Secondary, Ghost, Outline variants
- **Cards**: Market cards, fresh badges, navigation
- **Layout**: Container, Header, responsive patterns

### ✅ Role-Based UI System
- **Permission Utilities**: Role checking functions (`hasAdminAccess`, `isOwner`, etc.)
- **Context-Aware Components**: Components adapt UI based on user role
- **Admin Controls**: Conditional admin features in shared components
- **Role Hierarchy**: Owner → Manager → Customer permission levels

**Implementation Pattern:**
```tsx
// Import permissions utility
import { hasAdminAccess } from '@/utils/permissions';

// Component with role-based UI
function MarketCard({ market, ctx }) {
  const isAdmin = hasAdminAccess(ctx);

  return (
    <div>
      {/* Customer view - always visible */}
      <MarketInfo />

      {/* Admin controls - conditional */}
      {isAdmin && <AdminControls />}
    </div>
  );
}
```

### 🚧 In Progress
- **Forms**: Comprehensive form validation and error states
- **Admin Interface**: Extended input patterns for business configuration

### 📋 Future Implementation

#### Authentic Market Elements
- Hand-drawn fish icons (custom, ownable)
- Torn-paper edges on market cards
- Wave pattern dividers (subtle, not animated)
- Handwriting font for "Evan's notes"
- Subtle grain texture on backgrounds

#### Instagram-Ready Features
- High contrast ratios for text over images
- Consistent spacing for screenshot consistency
- Bold, recognizable brand elements
- Share-worthy gradient backgrounds

#### Role-Based UI Patterns
**Current Roles:**
- `owner` (Evan) - Full admin access
- `manager` (Future employees) - Admin access
- `customer` (Buyers) - Customer-only access

**Permission Functions:**
- `hasAdminAccess()` - Owner + Manager
- `isOwner()` - Owner only
- `canModifyMarkets()` - Market configuration access
- `canManageSchedules()` - Daily operations access

**UI Adaptations:**
- Button text changes: "Order Fish" vs "Manage Market"
- Button colors: Ocean (customer) vs Coral (admin)
- Additional admin controls: Settings gear, quick actions
- Conditional features: Market editing, schedule management

#### Additional Input Components
- Checkbox with custom styling
- Search input with search icon
- Number input with increment/decrement buttons
- File upload with drag & drop
- Date/time pickers
- Multi-select dropdown

## Design Token System

### Three-Tier Token Architecture

**`src/design-system/tokens.css` is the source of truth.** It is hand-authored, and
everything in the app resolves against it.

`tokens-three-tier.json` is a **generated export artifact** for Figma, produced by
`pnpm run tokens:export`. Nothing reads it back into CSS — the three-tier pipeline is
one-way (CSS → JSON). Editing the JSON has no effect on the app; edit `tokens.css`
and re-export.

The exported JSON models a **Brand → Alias → Component** hierarchy for Figma's benefit:
- **Brand layer**: Raw values (`brand.color.blue.500 = #0066CC`)
- **Alias layer**: Semantic names (`--color-action-primary`) — the layer code uses
- **Component layer**: Component-specific tokens (`component.button.primary.background`)

**All code uses the alias layer.**

### Token Naming Convention

- Colors: `--color-{category}-{variant}` (e.g., `--color-text-primary`, `--color-action-primary`, `--color-surface-secondary`)
- Font sizes: `--font-size-{scale}` (e.g., `--font-size-sm`, `--font-size-xl`)
- Spacing: `--space-{size}` (e.g., `--space-md`, `--space-xl`)
- Radius: `--radius-{size}` (e.g., `--radius-md`, `--radius-full`)
- Motion: `--duration-{speed}`, `--ease-out`

### Token Usage Requirements

**CRITICAL: All components MUST use semantic alias tokens**

#### Required Token Usage:
1. **Colors**: `var(--color-text-primary)`, `var(--color-surface-primary)`, etc.
2. **Spacing**: `var(--space-md)`, `var(--space-lg)`, etc.
3. **Typography**: `var(--font-size-md)`, `.heading-xl`, etc.
4. **Borders**: `var(--color-border-light)`, `var(--radius-md)`, etc.

#### NEVER:
- Use old flat token names (`--deep-navy`, `--ocean-blue`, `--cool-gray`, `--coral`, `--mint-fresh`, `--warm-gold`, `--light-gray`, `--warm-white`) — these no longer exist
- Hardcode hex colors (`#1A2B3D`)
- Hardcode pixel values for spacing (`20px`)
- Hardcode font sizes (`16px`)
- Use `rgba()` without tokens (`rgba(255,255,255,0.1)`)

#### Pattern:
```tsx
// ✅ GOOD
const styles: CSSProperties = {
  background: 'var(--color-surface-primary)',  // Auto-adapts to dark mode
  color: 'var(--color-text-primary)',
  padding: 'var(--space-md)',
  fontSize: 'var(--font-size-md)',
  borderRadius: 'var(--radius-md)',
};

// ❌ BAD
const styles: CSSProperties = {
  background: 'white',      // Breaks in dark mode
  color: '#1A2B3D',         // Breaks in dark mode
  padding: '20px',          // No token
  fontSize: '16px',         // No token
};
```

### Dark Mode Compatibility

**All components MUST work in both light and dark modes**

#### Dark Mode Testing Checklist:
- [ ] Test with browser DevTools dark mode emulation
- [ ] All text has sufficient contrast
- [ ] Borders are visible
- [ ] Glass effects are visible (not invisible white)
- [ ] Input states are distinguishable
- [ ] Focus states are visible
- [ ] Disabled states are clear

#### Browser Testing:
```
Chrome/Edge: DevTools > Rendering > prefers-color-scheme: dark
Firefox: DevTools > Settings > prefers-color-scheme: dark
Safari: Develop > Experimental > Dark Mode Override
```

#### Auto-Adapting Tokens:
These tokens automatically change in dark mode:
- `--color-text-primary`: Dark navy → Light gray
- `--color-text-secondary`: Cool gray → Lighter gray
- `--color-surface-primary`: White → Dark gray (#1f2937)
- `--color-bg-primary`: Warm white → Very dark gray (#111827)
- `--color-border-light`: Subtle blue → Visible tinted
- `--color-glass-light`: Light glass → Dark glass
- `--color-input-border`: Light gray → Tinted green

### Component Enforcement

#### For New Components:
1. **Start with template**: Copy `src/design-system/COMPONENT_TEMPLATE.tsx`
2. **Use utility classes**: Typography, layout, common patterns
3. **Use tokens in styles**: ALL colors, spacing, typography
4. **Test in dark mode**: Before committing

#### For Modified Components:
1. **Only fix if broken**: Don't refactor working components for token purity
2. **Fix dark mode issues**: Replace hardcoded values causing dark mode bugs
3. **Opportunistic replacement**: If editing a component, replace nearby hardcoded values

#### Resources:
- **Quick Reference**: `src/design-system/README.md`
- **Template**: `src/design-system/COMPONENT_TEMPLATE.tsx`
- **All Tokens**: `src/design-system/tokens.css`
- **Test Page**: `/design-test` (dev only) — primitives in the current theme; toggle
  your OS appearance to check dark mode

### Figma Integration

#### Export Tokens to Figma:
```bash
pnpm run tokens:export
```

Generates `src/design-system/tokens-three-tier.json` compatible with Figma Tokens plugin.
One-way export — see "Three-Tier Token Architecture" above.

#### Token Structure (as of 2026-07):
- **120 base `:root` tokens**: Colors, spacing, typography, shadows
- **18 light-mode admin overrides** on `[data-surface="admin"]`
- **64 dark-mode overrides**: 46 on `:root`, 18 on `[data-surface="admin"]`
- **Categories**: color, spacing, sizing, typography, shadows

Admin surfaces override tokens in *both* themes — `[data-surface="admin"]` swaps the
coral accent for blue and flattens glass effects. Because custom properties resolve
per-element, those overrides don't collide with the `:root` ones.

#### Workflow:
1. Edit `tokens.css`, then `pnpm run tokens:export`
2. Import tokens-three-tier.json to Figma Tokens plugin
3. Design in Figma using the exported tokens
4. Build components referencing the same alias token names