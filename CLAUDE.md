# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Preferred Working Style

The user prefers small, conversational interactions rather than large sweeping code changes. Engage in dialog, ask clarifying questions, and make incremental changes after discussion. Break down complex tasks into smaller steps and confirm approaches before implementation.

## Git Workflow

**IMPORTANT: Always work on feature branches, never commit directly to main.**

### Before Starting Any Feature Work
1. **Create a feature branch** before making any code changes
2. Use branch naming convention: `bbb-<descriptive-name>` (e.g., `bbb-customer-real-data`, `bbb-auth-fix`, `bbb-market-cards`)
3. Alternative prefixes for different work types as needed

### During Development
1. Make **incremental commits** as you complete each logical piece
2. Commit messages should be descriptive and clear
3. Keep commits atomic (one logical change per commit)

### When Feature is Complete
1. Ensure all tests pass and feature works as expected
2. Create a pull request to merge into `main`
3. Clean up branch after merge (optional)

### Example Workflow
```bash
# Start new feature
git checkout -b bbb-new-feature

# Make changes, test, then commit
git add .
git commit -m "Add feature description"

# When ready, push and create PR
git push -u origin bbb-new-feature
```

**Why this matters:** Working on branches keeps main stable, allows for code review, and makes it easier to experiment without breaking the working codebase.

## Project Overview

This is a RedwoodSDK (RWSDK) project - a TypeScript framework for building server-driven web applications on Cloudflare Workers with React Server Components, WebAuthn authentication, and Prisma ORM with D1 database.

**Current RWSDK Version:** 1.0.0-beta.42 (upgraded from beta.9 on 2025-12-24)

rwsdk rules and patterns are located in `@.cursor/rules/`

### RWSDK 1.x Features
- **Server Components + Server Functions**: RSC with "use server" for mutations
- **Durable Objects**: Session storage and isolated per-org databases ready
- **Client Navigation**: Enhanced GET-based RSC requests
- **Server Action Redirects**: Native redirect support from server functions
- **capnweb Integration**: RPC library for internal communication (~0.2.0)

## Common Commands

### Development
```bash
pnpm run dev            # Start development server
pnpm run dev:init       # Initialize dev environment
pnpm run worker:run     # Run worker scripts
```

### Database Operations
```bash
pnpm run migrate:dev    # Apply migrations locally (uses --local flag)
pnpm run migrate:prd    # Apply migrations to production (uses --remote flag)  
pnpm run migrate:new    # Create new migration
pnpm run seed           # Run database seeding script
```

### Type Checking & Code Quality
```bash
pnpm run types          # Run TypeScript type checking
pnpm run check          # Generate types and run type checking
pnpm run generate       # Generate Prisma client and Wrangler types
```

### Build & Deploy
```bash
pnpm run build          # Build for production
pnpm run release        # Full deployment pipeline (clean + generate + build + deploy)
pnpm run clean          # Clean Vite cache
```

## Architecture

### Key Files
- `src/worker.tsx` - Main Cloudflare Worker entry point, defines app middleware and routing
- `src/db.ts` - Database setup with Prisma D1 adapter
- `src/session/` - Session management using Durable Objects
- `wrangler.jsonc` - Cloudflare Workers configuration
- `prisma/schema.prisma` - Database schema (generates to `generated/prisma/`)

### Application Structure
- **Middleware Pattern**: App uses middleware functions for auth, session management, and headers
- **Context System**: Request context (`AppContext`) carries session and user data through the request lifecycle  
- **Route Organization**: Routes are organized in `src/app/pages/` with dedicated route files
- **Session Management**: Uses Cloudflare Durable Objects for persistent session storage

### Database
- Uses Prisma with D1 adapter for SQLite on Cloudflare
- Schema includes `User` and `Credential` models for WebAuthn authentication
- Generated Prisma client outputs to `generated/prisma/`
- Migrations stored in `migrations/` directory

### Authentication
- WebAuthn (passkey) authentication via `@simplewebauthn` packages
- User routes in `src/app/pages/user/` handle login/registration
- Sessions persist via Durable Objects with automatic cleanup on auth errors

## Code Organization Philosophy

### Full-Stack Colocation Pattern
- **Core Principle**: "Colocate everything until it hurts. Then abstract." (Kent C. Dodds)
- Code that changes together should live together
- Place components, logic, styles, and tests in the same folder
- Prioritize proximity and readability over strict separation of concerns

### Addon Pattern
- Each addon is a self-contained folder containing:
  - Pages and routes
  - Server logic and client components
  - Database migrations if needed
  - All related styles and logic
- Addons are fully pluggable and require no additional configuration
- Can be easily shared, copied, forked, and customized
- Embrace duplication over complex, configurable components

### RWSDK Data Fetching Pattern
**Server Components + Server Functions (NOT JSON APIs)**
- **Server Components** (Page.tsx): Fetch data directly with async/await, pass to client components as props
- **Client Components** (UI.tsx): Handle interactivity, call server functions for mutations
- **Server Functions** (functions.ts): Mark with "use server", handle CRUD operations, use revalidatePath()
- **JSON APIs**: Only create for external clients (mobile apps, webhooks), NOT for internal UI

**File Structure:**
```
src/app/pages/feature/
  ├── FeaturePage.tsx      # Server component (fetches data)
  ├── FeatureUI.tsx        # Client component ("use client")
  ├── functions.ts         # Server functions ("use server")
  └── routes.ts            # Route definitions
```

**Example Pattern:**
```tsx
// FeaturePage.tsx (server component)
export async function FeaturePage({ ctx }) {
  const data = await db.model.findMany({ where: { orgId: ctx.currentOrganization.id }});
  return <FeatureUI data={data} />
}

// FeatureUI.tsx (client component)
"use client";
import { createItem, updateItem } from "./functions";
export function FeatureUI({ data }) {
  const handleSave = async () => {
    await createItem({ name: "..." });
  };
  return <div>...</div>
}

// functions.ts (server functions)
"use server";
import { requestInfo } from "rwsdk/worker";
import { revalidatePath } from "rwsdk/cache";
export async function createItem(data) {
  const { ctx } = requestInfo;
  await db.model.create({ data: { ...data, organizationId: ctx.currentOrganization.id }});
  revalidatePath("/feature");
}
```

### Component Organization System

**CRITICAL: Follow this pattern for all new features. Updated 2025-12-25.**

#### Philosophy: Primitives in Design System, Compositions in Pages

**Design System (`/src/design-system/`)** - Primitives only:
- Atoms: Button, Input, Badge, Container, Card, Toggle
- Shared across 3+ pages OR needed in Figma library
- No page-specific logic or business rules
- Import: `import { Button, Container } from '@/design-system'`

**Page Components (`/src/app/pages/[feature]/components/`)** - Feature-specific:
- Compositions built from design system primitives
- Live alongside the page that uses them
- Can duplicate if needed (two different MarketCards OK)
- Import: `import { Header, MarketCard } from './components'`

#### When Building New Features:

1. **Start with inline components** in your page's UI file
2. **Extract to `/components/` subfolder** when they get large (>50 lines)
3. **Only move to design system** if used on 3+ pages
4. **Use semantic tokens** (`var(--color-action-primary)`, `var(--space-md)`) everywhere

#### Example Structure:

```
src/
├── design-system/              # Primitives only
│   ├── Button.tsx              # All button variants (customer + admin)
│   ├── components/
│   │   ├── Container.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── FormControls.tsx
│   ├── tokens.css              # Design tokens (colors, spacing, etc)
│   └── index.ts                # Barrel export
│
├── app/pages/
│   ├── home/                   # Home page feature
│   │   ├── CustomerHome.tsx    # Server component (data fetching)
│   │   ├── CustomerHomeUI.tsx  # Client component (just wiring)
│   │   └── components/         # Home-specific components
│   │       ├── Header.tsx
│   │       ├── MarketCard.tsx  # Customer-facing version
│   │       ├── FreshHero.tsx
│   │       ├── QuickActions.tsx
│   │       ├── BottomNavigation.tsx
│   │       └── index.ts
│   │
│   └── admin/
│       ├── dashboard/
│       │   ├── AdminDashboard.tsx
│       │   ├── AdminDashboardUI.tsx
│       │   └── components/     # Admin-specific components
│       │       └── CompactMarketCard.tsx  # Admin version
│       └── markets/
│           └── MarketConfigUI.tsx
```

#### Rules for Component Placement:

**Move to design-system IF:**
- Used on 3+ different pages, OR
- Needs to be in Figma library, OR
- Is a true primitive (Button, Input, Badge, etc)

**Keep in page components IF:**
- Used on 1-2 pages
- Contains page-specific business logic
- Frequently changes with page features

**Duplication is OK:**
- Different `MarketCard` for customer vs admin = GOOD
- Lets each evolve independently
- Follows colocation principle

#### Import Patterns:

```tsx
// ✅ GOOD - Design system primitives
import { Button, Container, Card, TextInput } from '@/design-system'

// ✅ GOOD - Page-specific components
import { Header, MarketCard, QuickActions } from './components'

// ❌ BAD - Don't import from other pages
import { MarketCard } from '@/app/pages/home/components'  // NO!

// ❌ BAD - Don't put page-specific components in design-system
// If it's only used on one page, it belongs in that page's /components/ folder
```

#### Testing Design System:

Visit `/design-test` to see all design system primitives.
Page-specific components are tested on their actual pages.

### Component Variants Pattern

For A/B testing or preserving alternate designs:
- File naming: `Component.v1.tsx`, `Component.v2.tsx`
- Export naming: `ComponentV1`, `ComponentV2`
- Swap in barrel export: `export { ComponentV2 as Component } from './Component.v2'`
- No runtime feature flags - swap in code, one line change
- Delete old variants when decision made

**Example:**
```tsx
// index.ts - single source of truth
export { FreshHeroV2 as FreshHero } from './FreshHero.v2';  // Change to .v1 to revert
export { BottomNavigationV2 as BottomNavigation } from './BottomNavigation.v2';
```

### Design System Tokens

**CRITICAL: Three-tier semantic token system. Never use old flat names.**

#### Token Rules
- **ALWAYS** use semantic tokens: `var(--color-text-primary)`, `var(--color-surface-primary)`, etc.
- **NEVER** use old flat tokens: ~~`--deep-navy`~~, ~~`--ocean-blue`~~, ~~`--cool-gray`~~, ~~`--coral`~~, ~~`--mint-fresh`~~, ~~`--warm-gold`~~, ~~`--light-gray`~~, ~~`--warm-white`~~ — these no longer exist
- **NEVER** hardcode hex values (`#1A2B3D`, `#6B7280`, etc.) — use tokens
- **NEVER** use raw `rgba()` — use token equivalents

#### Most-Used Tokens (cheat sheet)
```css
/* Text */
--color-text-primary        /* headings, body */
--color-text-secondary      /* captions, muted */
--color-text-tertiary       /* placeholders, disabled */
--color-text-inverse        /* white text on colored bg */

/* Actions */
--color-action-primary      /* buttons, links (ocean blue) */
--color-action-secondary    /* secondary CTA (coral) */

/* Surfaces */
--color-surface-primary     /* cards, panels (white / dark) */
--color-surface-secondary   /* subtle backgrounds */
--color-bg-primary          /* page background */

/* Borders */
--color-border-subtle       /* faint separators */
--color-border-light        /* card borders */
--color-border-input        /* form inputs */

/* Status */
--color-status-success      /* green/mint */
--color-status-warning      /* gold */
--color-status-error        /* coral/red */

/* Spacing: --space-xs/sm/md/lg/xl/2xl */
/* Radius: --radius-sm/md/lg/xl/full */
/* Font size: --font-size-xs/sm/md/lg/xl/2xl/3xl/4xl/5xl */
/* Shadows: --shadow-sm/md/lg */
```

#### References
- **Full token definitions**: `src/design-system/tokens.css`
- **Three-tier JSON (Figma source)**: `src/design-system/tokens-three-tier.json`
- **Design patterns & guidelines**: `src/design-system/patterns.md`

## Development Notes

- TypeScript paths configured: `@/*` maps to `src/*`, `@generated/*` maps to `generated/*`
- Uses pnpm as package manager
- Environment variables needed: `DATABASE_URL`, `WEBAUTHN_APP_NAME`
- Cloudflare D1 database binding configured as `DB`
- Update `__change_me__` placeholders in `wrangler.jsonc` for deployment