# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Preferred Working Style

The user prefers small, conversational interactions rather than large sweeping code changes. Engage in dialog, ask clarifying questions, and make incremental changes after discussion. Break down complex tasks into smaller steps and confirm approaches before implementation.

## Project Overview

This is a RedwoodSDK (RWSDK) project - a TypeScript framework for building server-driven web applications on Cloudflare Workers with React Server Components, WebAuthn authentication, and Prisma ORM with D1 database.

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

### Design System Approach
- **Master Design Reference**: `design-artifacts/customer.html` contains the complete design system
- Extract CSS custom properties as design tokens for consistency
- Mobile-first approach with careful attention to container behavior
- Use the existing design system (colors, spacing, typography, shadows) across all components
- Other design artifacts should be stripped to components and rebuilt with master styles

## Development Notes

- TypeScript paths configured: `@/*` maps to `src/*`, `@generated/*` maps to `generated/*`
- Uses pnpm as package manager
- Environment variables needed: `DATABASE_URL`, `WEBAUTHN_APP_NAME`
- Cloudflare D1 database binding configured as `DB`
- Update `__change_me__` placeholders in `wrangler.jsonc` for deployment