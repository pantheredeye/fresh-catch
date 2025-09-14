# Design Patterns Reference - Fresh Catch

*Quick reference for implementing components consistent with the design system*

## Key Design Tokens

### Colors
- `--ocean-gradient`: Primary actions (login, order buttons)
- `--coral-gradient`: Secondary actions, alerts
- `--mint-fresh`: Success states, "fresh" badges
- `--warm-white`: Base backgrounds (never pure white)
- `--deep-navy`: Text headers (softer than black)
- `--cool-gray`: Secondary text

### Glassmorphism Pattern
```css
/* Standard glass card */
background: rgba(255, 252, 248, 0.1);
backdropFilter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
```

### Spacing & Sizing
- `--space-sm: 12px` - List items, small gaps
- `--space-md: 20px` - Standard padding
- `--space-lg: 28px` - Section spacing
- `--space-xl: 40px` - Major section breaks
- `--radius-md: 20px` - Cards, forms
- `--radius-lg: 28px` - Major containers

### Shadows
- `--shadow-md`: Standard cards
- `--shadow-lg`: Hover/elevated states
- `--shadow-coral`: Action elements

## Component Patterns

### Button Variants
- **Primary**: `variant="primary"` - Ocean gradient, main actions
- **Secondary**: `variant="secondary"` - Coral gradient, secondary actions
- **Ghost**: `variant="ghost"` - Subtle background, low priority
- **Outline**: `variant="outline"` - Transparent with ocean border

### Form Styling
```jsx
// Input styles
padding: 'var(--space-md)',
border: '1px solid rgba(255, 255, 255, 0.3)',
borderRadius: 'var(--radius-md)',
background: 'rgba(255, 255, 255, 0.1)',
color: 'white',
backdropFilter: 'blur(5px)'
```

### Typography Hierarchy
- **Titles**: `font-family: var(--font-display)`, `font-weight: 700`
- **Labels**: `font-size: 14px`, `font-weight: 600`, `text-transform: uppercase`
- **Body**: `font-family: var(--font-modern)`
- **Prices/Times**: `font-family: var(--font-mono)` (trustworthy feel)

## Interaction Patterns

### Hover Effects
```css
transform: translateY(-1px);
box-shadow: var(--shadow-lg);
```

### Active States
```css
transform: scale(0.98);
```

### Transitions
```css
transition: all 0.3s ease;
```

## Layout Patterns

### Full-screen Auth
```jsx
minHeight: '100vh',
background: 'var(--ocean-gradient)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center'
```

### Card Containers
```jsx
maxWidth: '420px', // Forms
padding: 'var(--space-xl)',
borderRadius: 'var(--radius-lg)'
```

## Business Logic Patterns

### Context-Aware Components
- Components know which business context they're in
- Single components handle multiple user types via props
- Role-based UI via `adminMode={user.isAdmin}` pattern

### Multi-Tenant Data
- Every user belongs to organizations via Membership table
- Individual customers get auto-created "individual" organizations
- Business customers get shared "business" organizations

## File Organization
- Design system components: `/src/design-system/components/`
- Export all components from `/src/design-system/index.ts`
- Import tokens: `import "@/design-system/tokens.css"`
- Co-locate related logic in same files/folders