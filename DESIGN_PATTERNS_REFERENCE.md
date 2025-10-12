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

### Input Components
- **TextInput**: Standard text inputs with warm glassomorphism
- **Textarea**: Multi-line inputs with auto-resize
- **TimeInput**: Specialized for time values (center-aligned)
- **TimeRow**: Start/end time pairs ("8:00 AM to 2:00 PM")
- **Select**: Custom dropdown with ocean blue styling
- **InlineSelect**: Compact selects within text ("Every [Saturday]")
- **RadioGroup**: Custom radio buttons with descriptions
- **ToggleSwitch**: iOS-style toggles for settings

### Form Styling

#### Standard Inputs (TextInput, Textarea)
```jsx
// Base input pattern - warm glassomorphism
border: '2px solid #e0e0e0',
borderRadius: 'var(--radius-sm)',
background: 'var(--warm-white)',
color: 'var(--deep-navy)',
padding: 'var(--space-md)',
fontSize: '16px',
transition: 'all 0.3s ease'

// Focus state
':focus': {
  borderColor: 'var(--ocean-blue)',
  boxShadow: '0 0 0 3px rgba(0, 102, 204, 0.1)',
  background: 'white'
}
```

#### Auth Form Inputs (LoginForm style)
```jsx
// Glass effect for auth pages over gradients
border: '1px solid rgba(255, 255, 255, 0.3)',
borderRadius: 'var(--radius-md)',
background: 'rgba(255, 255, 255, 0.1)',
color: 'white',
backdropFilter: 'blur(5px)'
```

#### Input Labels
```jsx
fontSize: '12px',
fontWeight: 600,
color: 'var(--deep-navy)', // or white on auth pages
textTransform: 'uppercase',
letterSpacing: '1px'
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

### Role-Based UI System

#### Permission Utilities (`/src/utils/permissions.ts`)
```tsx
import { hasAdminAccess, isOwner, canModifyMarkets } from '@/utils/permissions';

// Role checking in components
const isAdmin = hasAdminAccess(ctx);
const canEdit = canModifyMarkets(ctx);
```

#### Context-Aware Components
- Components know which business context they're in
- Single components handle multiple user types via props
- Role-based UI via permission utilities pattern
- Server components access context via `ctx` prop: `{ ctx }: { ctx: AppContext }`
- Server functions access context via `requestInfo.ctx.currentOrganization`

#### Role Hierarchy
- **Owner** (`owner`): Evan - Full admin access to markets and schedules
- **Manager** (`manager`): Future employees - Admin access to schedules
- **Customer** (`customer`): Buyers - Customer-only access

#### Implementation Pattern
```tsx
function MarketCard({ market, ctx }) {
  const isAdmin = hasAdminAccess(ctx);

  return (
    <div>
      {/* Customer view - always visible */}
      <button style={{
        background: isAdmin ? 'var(--coral-gradient)' : 'var(--ocean-gradient)'
      }}>
        {isAdmin ? 'Manage Market' : 'Order Fish'}
      </button>

      {/* Admin-only controls */}
      {isAdmin && <AdminControls />}
    </div>
  );
}
```

### Multi-Tenant Data
- Every user belongs to organizations via Membership table
- Individual customers get auto-created "individual" organizations
- Business customers get shared "business" organizations
- Role-based access via Membership.role field (`owner`/`manager`/`customer`)
- Organization context automatically available in all components via AppContext

## Admin Dashboard Navigation Pattern

### Responsive Grid Layout
Mobile-first design that grows naturally as features are added.

**Mobile:** 1 column stacked
```
[📍 Markets               ]
[Manage market locations  ]

[👁️ View Site             ]
[See customer view        ]
```

**Desktop:** 2 columns side-by-side
```
[📍 Markets       ]  [👁️ View Site      ]
[Manage markets   ]  [See customer view ]
```

**Future (4+ features):** Maintains 2-column desktop, 1-column mobile
```
[📍 Markets   ]  [📦 Inventory  ]
[📋 Orders    ]  [👁️ View Site  ]
```

### Admin Nav Card Component
```tsx
// AdminDashboardUI.tsx structure
<div className="admin-nav-grid">
  <a href="/admin/config" className="admin-nav-card">
    <div className="admin-nav-card__icon">📍</div>
    <div className="admin-nav-card__content">
      <h3 className="admin-nav-card__title">Markets</h3>
      <p className="admin-nav-card__description">
        Manage market locations and schedules
      </p>
    </div>
  </a>
</div>
```

### CSS Classes (admin-auth.css)
- `.admin-nav-grid` - Responsive grid container (1 col mobile, 2 col desktop)
- `.admin-nav-card` - Button-style card with hover effects
- `.admin-nav-card__icon` - Large emoji icon (48px)
- `.admin-nav-card__title` - Bold card title (20px)
- `.admin-nav-card__description` - Helper text (14px)

### Usage Guidelines
- **Big tap targets:** Minimum 120px height for accessibility
- **Clear hierarchy:** Icon → Title → Description
- **Equal visual weight:** All cards same size/prominence
- **Button-style over decorative:** Clarity of purpose, no ambiguity
- **Industrial design:** Form follows function, obvious interactions

### When to Add Cards
Add new cards when:
1. New admin feature launches (inventory, orders, etc.)
2. Feature is daily-use (not settings/one-time setup)
3. Feature deserves top-level navigation prominence

Don't add cards for:
- Infrequent settings (put in existing section)
- Sub-features (make them tabs/sections within parent)
- External links (use different UI pattern)

## File Organization
- Design system components: `/src/design-system/components/`
- Admin design system: `/src/admin-design-system/`
- Export all components from `/src/design-system/index.ts`
- Import tokens: `import "@/design-system/tokens.css"`
- Import admin auth styles: `import "@/admin-design-system/admin-auth.css"`
- Co-locate related logic in same files/folders