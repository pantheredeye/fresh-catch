# CLAUDE.md

Guidance for Claude Code working in this repo.

## Preferred Working Style

Small, conversational interactions over large sweeping changes. Ask
clarifying questions, make incremental changes after discussion, confirm
approach before implementing.

## Stack

Fresh Catch v2 is a plain **Hono app on Cloudflare Workers**, built with Vite
and `@cloudflare/vite-plugin`. No React, no RedwoodSDK.

- **Hono** — routing, middleware, request/response (`hono/jsx` for server render)
- **Vite** (`@cloudflare/vite-plugin`) — dev server + build, worker + client bundling
- **D1** — SQLite on Cloudflare, via **Prisma** (`@prisma/adapter-d1`)
- **Vitest** (`@cloudflare/vitest-pool-workers`) — tests run inside a real Workers runtime

### Why not RedwoodSDK

`v1` (see `main`) was built on RedwoodSDK + React Server Components. A full
audit (`docs/audit/`) found the framework layer — RSC hydration edge cases,
a `react-dom/server` resolution regression above rwsdk 1.4.1, DO-backed
sessions that outgrew their value — cost more than it gave a single-vendor
app this size. `v2` rebuilds on boring primitives: Hono routes, signed-cookie
sessions, vanilla-TS islands for interactivity. See `docs/audit/REBUILD-PLAN.md`
for the full rationale.

## Git Workflow

**Target `v2`, not `main`, until the cutover bead lands.** `main` stays on
the old RedwoodSDK app until `v2` is ready to replace it in production.

- Feature branches: `bbb-<descriptive-name>` (or another prefix as needed)
- Incremental, atomic commits
- PR into `v2`

## Commands

```bash
pnpm run dev          # vite dev — serves the worker + client assets
pnpm run build        # vite build
pnpm run preview      # preview a production build
pnpm run deploy       # migrate:prd, then wrangler deploy
pnpm run types        # tsc
pnpm run generate     # prisma generate + wrangler types
pnpm test             # vitest run (applies D1 migrations to a fresh test DB first)
pnpm run test:watch
pnpm run migrate:dev  # prisma generate + apply migrations to local D1
pnpm run migrate:prd  # apply migrations to remote D1
pnpm run seed         # apply prisma/seed.sql to local D1
```

New migration: hand-edit `prisma/schema.prisma`, then generate the SQL with
`prisma migrate diff --from-migrations migrations --to-schema-datamodel prisma/schema.prisma --script --output migrations/000N_name.sql`
and apply with `pnpm run migrate:dev`.

## Architecture

### Key files
- `src/index.ts` — Hono app entry: bindings, middleware chain, route mounts, default export
- `src/types.ts` — `Bindings` type (`c.env`)
- `src/lib/env.ts` — required-secret checks
- `src/lib/db.ts` — Prisma client, lazily instantiated per isolate with the D1 adapter
- `src/lib/ai/structure.ts` — `runStructured<T>`: text/audio → LLM → validated JSON. Features supply prompt + validator + optional fallback
- `prisma/schema.prisma` — data model; `migrations/` holds the generated SQL, applied via `wrangler d1 migrations`
- `src/ui/document.tsx` — hono/jsx HTML shell
- `wrangler.jsonc` — Cloudflare config. Worker name is `fresh-catch-v2` (new
  identity, isolated from the live `digitalglue-market` worker and its
  secrets) with a placeholder D1 `database_id` until cutover.

### Feature layout

One folder per feature under `src/features/`, each owning its own
`routes.tsx` (or `.ts`) and any local queries/components. Shared primitives
only in `src/ui/`; `src/lib/` for db/env/small utilities. Colocate until it
hurts, then extract — same spirit as before, restated for Hono.

```
src/
  index.ts
  types.ts
  lib/
    env.ts
    db.ts
  ui/
    document.tsx        # shared HTML shell
  features/
    home/
      routes.tsx
    health/
      routes.ts
prisma/
  schema.prisma
  seed.sql
migrations/              # SQL applied via wrangler d1 migrations
```

### Request/response conventions
- Bindings via `c.env` (typed `Bindings` from `src/types.ts`), request-scoped
  values via `c.var`
- Server-rendered HTML: `c.html(<Document>...</Document>)` using `hono/jsx`
- JSON: `c.json(...)`
- Mount feature routers in `src/index.ts` with `app.route(...)`

### Accessibility floors

Tideline (`docs/redesign/fresh-catch-handoff.md` §3 — the source of truth for
this section) supersedes the pre-rebuild audit's AA-leaning floors:

- **Light-only.** `color-scheme: light`, `:root { color-scheme: light }`, no
  `prefers-color-scheme: dark` block. Locked decision (epic #69) — the old
  app's failure mode was a dark reading surface on phones in direct sun, not
  a light/dark mismatch, so the fix is dropping dark mode outright rather
  than pairing it correctly.
- 58px minimum touch targets (buttons/fields), 19px minimum body text (20px
  at ≥700px viewport), 17px floor for labels/helper/meta text.
- **7:1 (AAA) contrast for body/small text**, not 4.5:1 — see the pairing
  comments in `public/style.css`'s `:root` block. 4.5:1 for large text and
  graphic elements; 3:1 for input/control borders.
- `:focus-visible { outline: 4px solid var(--color-focus-ring); outline-offset: 3px }`
  globally, flipped to `--color-focus-ring-on-dark` inside `.band-sea`/`.band-deep`.
- Square corners, no shadows — Tideline is flat.
- Respect `prefers-reduced-motion` (moot today: no ambient motion exists).

**Primitives** (`src/ui/`): `Button` (variants `primary`/`secondary`/`ghost`,
full-width 58px block by default, `inline` for rare non-block usage, plus
`id`/`class`/`ariaLabel`/`ariaPressed`/`data` pass-through), `Input`/`Select`/
`Textarea`, `Card`, `CardHeader`, `Sheet`, `Page` (`bleed` for full-bleed
Band layouts, `wide` for admin tables), `SectionHeading` (the heavy-rule/
hairline/right-aligned-meta device), `SplitControl` (exactly two 60px halves
— don't extend to three-up), `BackLink`, `Band` (`tone`: `sand`/`paper`/
`shallow`/`sea`/`deep`).

**Guardrails, enforced by `src/ui/design-guardrails.test.ts`:**
- No `style=` attrs anywhere in `src/**/*.tsx` — go through a utility class
  (`.stack`, `.cluster`, `.muted`, …) or a primitive.
- No raw `.btn` class outside `src/ui/` — use `Button`.
- Every color lives in `public/style.css`'s `--palette-*` layer; components
  only ever reach it through the semantic `--color-*` layer (also enforced
  by `a11y.test.ts`'s no-raw-colour-literal check on `src/**/*.tsx`).
- The palette layer's documented pairs are checked against the 7:1/4.5:1/3:1
  floors above, and against a `prefers-color-scheme: dark` absence — fetched
  live from `public/style.css` via the `ASSETS` binding (needs
  `wrangler.jsonc`'s `assets.directory` set even though the Vite plugin
  resolves its own directory for real dev/build/deploy).

**AI guardrails, enforced by `src/lib/ai/guardrails.test.ts`:**
- `src/lib/**` never imports from `@/features/` — pass feature specifics in as options.
- `ai.run(` lives only under `src/lib/ai/` — call `runStructured` from `@/lib/ai/structure`.

## Removed in the rebuild — do not reintroduce

- Multi-org / multi-tenant support
- MCP server integration
- CommandBar / voice intent router
- WebAuthn / passkey auth
- Durable Objects for session storage (signed-cookie sessions instead)
- `--color-glass-*` / `--tint-*` / `--nav-accent-*` design tokens
- `@react-email/components` for email templates (plain HTML instead — this
  broke under rwsdk 1.5+ and isn't worth reintroducing)

These are deliberate scope cuts for `v2`, documented in `docs/audit/`. If a
feature genuinely needs one of these back, treat it as a new decision, not a
default.

## Reference docs

`docs/audit/` — the pre-rebuild audit: `features.md`, `auth-platform.md`,
`data-stripe.md`, `ux-a11y.md`, and `REBUILD-PLAN.md` (the plan this rebuild
follows). Source of truth for design and auth decisions in later beads.

`docs/redesign/` — the Tideline redesign (epic #69, beads #70-75):
`fresh-catch-handoff.md` §3 is the current a11y source of truth, superseding
`docs/audit/ux-a11y.md`'s AA-leaning floors above. `fresh-catch-E-tideline.html`
is the static mock the tokens/fonts were ported from.

## Development Notes

- TypeScript path: `@/*` → `src/*`
- pnpm package manager
- Env vars: `SESSION_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAILS` (see `.env.example`)
- Payments are optional (`src/features/payments/`, issue #60): without
  `STRIPE_SECRET_KEY` + a connected account (`STRIPE_CONNECT_ACCOUNT_ID` or
  `Vendor.stripeAccountId`) the "Request payment" action is hidden and orders
  settle in person. Charges are Stripe **Connect direct charges** on Evan's
  account with an `application_fee_amount` — he is merchant of record; never
  reintroduce destination charges. The webhook (`POST /webhooks/stripe`, a
  Connect endpoint) is mounted ahead of all middleware in `src/index.ts` so it
  keeps its raw body for signature verification
- D1 binding: `DB`. Accessed through Prisma (`src/lib/db.ts`); the D1 adapter
  talks to the binding directly, so `DATABASE_URL` in `prisma/schema.prisma`
  is a required-but-unused placeholder — `prisma generate`/`migrate diff`
  never read it, don't bother setting it
- No prod data has migrated into `v2`'s D1 yet — that's a later cutover bead.
  `docs/audit/data-stripe.md` §1a and `REBUILD-PLAN.md` §4 record the
  do-not-migrate list (8 dead `Organization` rows, a stray "Test popup" market)
- `wrangler.jsonc` worker name / D1 `database_id` are placeholders until the
  production cutover bead
