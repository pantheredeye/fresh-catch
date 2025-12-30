# Design System - Quick Reference

Fresh Catch design system for consistent, dark-mode-safe components.

## Token Usage

### Colors

```tsx
// ✅ DO - Use semantic tokens
color: 'var(--text-primary)'        // Auto-adapts: dark navy → light gray
background: 'var(--surface-primary)' // Auto-adapts: white → dark surface
borderColor: 'var(--border-light)'   // Auto-adapts: light → tinted

// ❌ DON'T - Hardcode colors
color: '#1A2B3D'
background: 'white'
borderColor: '#e0e0e0'
```

**Color Tokens:**
- `--text-primary` - Main text (dark navy → light gray in dark mode)
- `--text-secondary` - Secondary text (cool gray → lighter gray)
- `--surface-primary` - Card/component backgrounds (white → dark gray)
- `--page-background` - Page background (warm white → very dark gray)
- `--border-light/medium` - Borders (subtle → visible in dark mode)
- `--glass-light/medium` - Glass effects (light → dark glass)

### Typography

```tsx
// ✅ DO - Use utility classes
<h1 className="heading-2xl">Page Title</h1>
<p className="body-md">Body text</p>
<span className="label-sm">Input label</span>
<div className="caption">Helper text</div>

// OR use tokens in style objects
fontSize: 'var(--font-size-xl)',
fontWeight: 'var(--font-weight-bold)',
lineHeight: 'var(--line-height-tight)'

// ❌ DON'T - Hardcode sizes
fontSize: '24px'
fontWeight: 700
```

**Typography Classes:**
- `.heading-5xl` through `.heading-lg` - Headers (40px → 18px)
- `.body-lg`, `.body-md`, `.body-sm` - Body text
- `.label-lg`, `.label-md`, `.label-sm` - Labels (uppercase, letter-spaced)
- `.caption` - Small secondary text
- `.mono`, `.mono-md`, `.mono-sm` - Monospace (prices, times)

**Typography Tokens:**
- Font sizes: `--font-size-xs` (12px) through `--font-size-5xl` (40px)
- Weights: `--font-weight-normal/medium/semibold/bold`
- Line heights: `--line-height-tight/base/relaxed`

### Spacing

```tsx
// ✅ DO - Use utility classes
<div className="flex-col gap-md p-lg mb-xl">
  <div className="p-md">Content</div>
</div>

// OR tokens
padding: 'var(--space-md)'
gap: 'var(--space-lg)'
marginBottom: 'var(--space-xl)'

// ❌ DON'T - Hardcode pixels
padding: '20px'
gap: '28px'
```

**Spacing Tokens:**
- `--space-xs` (8px) - Tight spacing
- `--space-sm` (12px) - Small gaps
- `--space-md` (20px) - Standard padding
- `--space-lg` (28px) - Section spacing
- `--space-xl` (40px) - Major breaks
- `--space-2xl` (56px) - Hero spacing

## Dark Mode Safe Patterns

### Surfaces & Backgrounds

```tsx
// ✅ AUTO-ADAPTS
background: 'var(--surface-primary)'  // white → #1f2937
background: 'var(--page-background)'  // #FFFCF8 → #111827

// ❌ BREAKS IN DARK MODE
background: 'white'
background: '#FFFCF8'
background: 'rgba(255,255,255,0.1)'  // Invisible in dark mode
```

### Borders

```tsx
// ✅ AUTO-ADAPTS
border: '1px solid var(--border-light)'
borderColor: 'var(--input-border)'

// ❌ BREAKS IN DARK MODE
border: '1px solid #e0e0e0'  // Too light in dark mode
```

### Text

```tsx
// ✅ AUTO-ADAPTS
color: 'var(--text-primary)'    // dark → light
color: 'var(--text-secondary)'  // gray → lighter gray

// ❌ BREAKS IN DARK MODE
color: '#1A2B3D'  // Dark text on dark background
color: 'white'    // Light text on light background
```

### Glass Effects

```tsx
// ✅ AUTO-ADAPTS
background: 'var(--glass-light)'  // Light glass → dark glass
border: '1px solid var(--glass-border-light)'
backdropFilter: 'blur(10px)'

// ❌ BREAKS IN DARK MODE
background: 'rgba(255,255,255,0.1)'  // White glass invisible in dark
border: '1px solid rgba(255,255,255,0.2)'
```

## Layout Utilities

### Flexbox

```tsx
// Common patterns
<div className="flex-col gap-md">      // Vertical stack with medium gap
<div className="flex-between">         // Space between, centered vertically
<div className="flex-center">          // Center both axes
<div className="flex gap-lg">          // Horizontal with large gap
```

**Classes:**
- `.flex`, `.flex-col`, `.flex-row`
- `.flex-center`, `.flex-between`, `.flex-start`, `.flex-end`
- `.flex-wrap`, `.flex-1`

### Grid

```tsx
<div className="grid-2">  // 2 columns
<div className="grid-3">  // 3 columns
<div className="grid-auto">  // Auto-fit, min 250px
```

### Spacing

```tsx
.gap-xs/sm/md/lg/xl      // Gap between flex/grid items
.p-xs/sm/md/lg/xl        // Padding
.mb-sm/md/lg/xl          // Margin bottom
```

## Component Patterns

### Status Badges

```tsx
<span className="status-badge status-badge--pending">Pending</span>
<span className="status-badge status-badge--completed">Done</span>
<span className="status-badge status-badge--cancelled">Cancelled</span>
```

### Info Boxes

```tsx
<div className="info-box">Regular info</div>
<div className="info-box info-box--warning">Warning message</div>
<div className="info-box info-box--error">Error message</div>
<div className="info-box info-box--success">Success message</div>
```

### Forms

```tsx
<div className="form-group">
  <label className="label-sm">Email</label>
  <input type="email" />
  <span className="caption">We'll never share your email</span>
</div>

<div className="form-row">  // Side-by-side on desktop, stacks on mobile
  <input type="text" />
  <input type="text" />
</div>
```

### Cards

```tsx
<div className="card-elevated">  // Standard card with shadow
  Content
</div>

<div className="card-glass">  // Glassmorphism card
  Content
</div>
```

## When to Use What

### Use Utility Classes For:
- Typography hierarchy (`.heading-xl`, `.body-md`)
- Common layouts (`.flex-col`, `.gap-md`)
- Text colors (`.text-primary`, `.text-secondary`)
- Standard spacing (`.p-lg`, `.mb-md`)

### Use Inline Styles with Tokens For:
- Component-specific styles
- Non-standard spacing
- Composed styles from multiple tokens
- ALWAYS use `var(--token-name)` for colors/spacing/typography

### Use Inline Styles (dynamic) For:
- State-dependent values (`isActive ? 'var(--ocean-blue)' : 'var(--cool-gray)'`)
- Prop-dependent values
- Computed/calculated values
- Transform/transition animations

### NEVER Use:
- Hardcoded hex colors (`#1A2B3D` → use `var(--text-primary)`)
- Hardcoded pixel values for spacing (`20px` → use `var(--space-md)`)
- Hardcoded font sizes (`16px` → use `var(--font-size-md)`)
- Hardcoded `rgba()` for glass effects (use `var(--glass-light)`)

## Examples

### Good Component

```tsx
export function GoodCard({ title, children }) {
  return (
    <div className="card-elevated">
      <h2 className="heading-xl mb-md">{title}</h2>
      <div className="flex-col gap-sm">
        <p className="body-md text-secondary">{children}</p>
        <button style={{
          background: 'var(--ocean-gradient)',  // ✅ Token
          color: 'white',
          padding: 'var(--space-md)',            // ✅ Token
          borderRadius: 'var(--radius-md)',      // ✅ Token
          border: 'none'
        }}>
          Action
        </button>
      </div>
    </div>
  );
}
```

### Bad Component

```tsx
// ❌ DON'T DO THIS
export function BadCard({ title, children }) {
  return (
    <div style={{
      background: 'white',           // ❌ Breaks in dark mode
      padding: '20px',               // ❌ Hardcoded
      borderRadius: '12px',          // ❌ Hardcoded
      boxShadow: '0 2px 8px rgba(0,102,204,0.08)'  // ❌ Hardcoded
    }}>
      <h2 style={{
        fontSize: '24px',            // ❌ Use heading-2xl
        fontWeight: 700,             // ❌ Hardcoded
        color: '#1A2B3D',            // ❌ Breaks in dark mode
        marginBottom: '20px'         // ❌ Hardcoded
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
```

## Testing Dark Mode

### Browser DevTools:
```
Chrome/Edge: DevTools > ⋮ > More tools > Rendering > Emulate: prefers-color-scheme: dark
Firefox: DevTools > Settings (gear) > prefers-color-scheme: dark
Safari: Develop > Experimental > Dark Mode Override
```

### Checklist:
- [ ] All text readable (sufficient contrast)
- [ ] Borders visible
- [ ] Glass effects visible (not invisible white)
- [ ] Input borders/backgrounds visible
- [ ] Disabled states distinguishable
- [ ] Focus states visible
- [ ] Buttons readable

## Figma Integration

Export design tokens to Figma:
```bash
pnpm run tokens:export
```

This generates `src/design-system/tokens.json` compatible with Figma Tokens plugin.

## Resources

- **Tokens**: `src/design-system/tokens.css`
- **Template**: `src/design-system/COMPONENT_TEMPLATE.tsx`
- **Patterns**: `src/design-system/patterns.md`
- **Test Page**: `/dark-mode-test` - View all components in dark mode
