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

rwsdk rules and patterns are located in `@.cursor/rules/`

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

### Design System Approach
- **Master Design Reference**: `@src/design-system/patterns.md` contains the complete design system
- Extract CSS custom properties as design tokens for consistency
- Mobile-first approach with careful attention to container behavior
- Use the existing design system (colors, spacing, typography, shadows) across all components
- Other design artifacts should be stripped to components and rebuilt with master styles
- Reference `@DESIGN_PATTERNS_REFERENCE.md` for understanding our implementation 

## Development Notes

- TypeScript paths configured: `@/*` maps to `src/*`, `@generated/*` maps to `generated/*`
- Uses pnpm as package manager
- Environment variables needed: `DATABASE_URL`, `WEBAUTHN_APP_NAME`
- Cloudflare D1 database binding configured as `DB`
- Update `__change_me__` placeholders in `wrangler.jsonc` for deployment