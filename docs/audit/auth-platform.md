# Audit 3/4 — Auth + Platform

Read-only audit. Scope: auth end-to-end, accreted subsystems, stack verdict, rebuild auth recommendation.

---

## 1. Current auth, end to end

**Mechanism:** email-OTP only (6-digit code, no password, no passkey, no magic link). All three of those *were* built and later ripped out — see churn history below.

### Flow
1. Customer/admin enters email on `/login` (`AuthCard.tsx`, 300 lines — the whole login/verify/invite UI lives in one client component).
2. `requestOtp(email)` (`src/app/pages/user/functions.ts`) → `issueOtp` (`src/auth/otp-send.ts`): rate-limits (`src/rate-limit/`), generates a 6-digit code, hashes it (SHA-256) and upserts into D1 `LoginCode` (10 min TTL, 5 max attempts, one active code per email, `src/auth/login-codes.ts`), emails it via Resend (`src/utils/email.ts`).
3. Customer submits code → `verifyOtp(email, code)`: rate-limits again, checks the hash, then:
   - Finds or creates a `User` row.
   - **On create**, also creates an `Organization` (type `individual`) + `Membership` — every single customer gets a full multi-tenant org graph just to log in.
   - If arriving via `?b=<vendor-slug>`, also creates a `Membership` linking them to that vendor org.
   - Processes an invite token if present (`src/auth/invites.ts`).
   - Claims any guest orders placed under that email (`claimOrdersForUser`).
   - Computes `isAdmin` from membership roles, picks a "default" org (business org preferred), generates a fresh CSRF token, and **rotates the session** (new session ID, to prevent fixation) via the Durable Object.
   - Redirects to `/admin` or `/`.

### Session
- `rwsdk/auth`'s `defineDurableSession`, backed by `SessionDurableObject` (`src/session/durableObject.ts`) — one DO instance per session ID, SQLite-less, just `ctx.storage`.
- Session shape: `{ userId, currentOrganizationId, role, csrfToken, createdAt }`. Note `role` and `currentOrganizationId` are cached in the session but **re-validated against the DB on every request** in `worker.tsx`'s global middleware (~110 lines: load session → hydrate user+memberships → pick/repair org context → sync role drift → handle revoked membership → redirect).
- Cookie: `HttpOnly; Secure; SameSite=Lax; Max-Age=10y` (`src/session/cookie.ts`). Originally `SameSite=Strict`, changed to `Lax` in #49 because Stripe's return redirect is a cross-site top-level GET and Strict was silently minting a *second* anonymous session on return from checkout, which read as "got logged out."
- CSRF: a token lives in the session and is validated per mutating server action via `requireCsrf()` (`src/session/csrf.ts`). Deliberately throws a plain `Error`, not a `Response` — a thrown `Response` inside an RSC server action was found to break the action stream client-side (whitescreen).
- `resilientDO()` wraps every DO call with a single blind retry, added after DO-eviction-after-idle was observed to fail session loads.
- Anonymous visitors still get a session (DO + cookie) on first request, purely to hold a CSRF token and support guest checkout — i.e. there's no truly "logged-out, no session" state once a request is redirect the browser has touched the site.

### Authorization
- `hasAdminAccess(ctx)` (`src/utils/permissions.ts`): true if `currentOrganization.type === 'business'` and role is `owner`/`manager`. `/admin/*` is gated in `worker.tsx` route middleware (redirect-to-login if no user, 403 if not admin).
- Role hierarchy (`owner` > `manager` > `customer`) and per-action helpers (`canModifyMarkets`, `canManageTeam`, etc.) are all built on the assumption of multiple orgs/multiple staff — for an app with exactly one admin (Evan).

### Key files
`src/auth/{login-codes,otp-send,invites}.ts` · `src/session/{store,durableObject,cookie,csrf}.ts` · `src/app/pages/user/{functions,org-functions,LoginPage,Login,AuthCard,AcceptInvitePage,AcceptInviteUI,routes}.ts(x)` · `src/rate-limit/*` · `src/utils/{email,permissions}.ts` · session/user middleware block in `src/worker.tsx` (lines ~245–353).

### Legacy/dead weight already in the schema
- `Credential` model (WebAuthn public keys) — fully unused, no code references it anymore (passkeys deleted). Should be dropped in any rebuild.
- `WEBAUTHN_APP_NAME` / `WEBAUTHN_RP_ID` vars still in `wrangler.jsonc` — dead config from the same deleted feature.

### Pain points (from git log + code comments)
The commit history shows **five different auth mechanisms shipped and torn out in sequence** over the project's life:
1. Password + WebAuthn passkey registration (`f6e9883`, `c4b6414`)
2. "Adaptive passwordless auth + magic link hybrid" (`fd04af0`, #14)
3. Magic link fully deleted (`3978c35`, `4ad4304` — "strip magic token and device binding from session layer")
4. WebOTP API + hidden autofill (`4e242e1` remove, `e08725e` remove conditional mediation, `84ccb61`/`f0b73b6` fix then eventually gutted)
5. Landed on plain email-OTP (#20 "Onboarding rework... kill whitescreen", 2026-07)

Concrete bugs hit along the way, several of them the *same class* recurring:
- **Session-save clobbering**: `58e113a` — passkey setup crash because `sessions.save()` created a brand-new session and wiped auth state instead of merging. The DO's `saveSession()` now manually merges fields against `existing` (see `durableObject.ts:39-49`) specifically to prevent this — a handwritten workaround for a footgun in the session-store abstraction.
- **DO eviction**: `2836524` — sessions silently failing after idle DO eviction; fixed with `resilientDO()`'s retry-once wrapper, now wrapping ~15 call sites.
- **Corrupted cookie crash**: `a151eae` — unguarded `atob()` on a malformed session cookie threw.
- **RSC action redirect hang**: `e5c3132` (#43) — page/server-action components can't return a raw `302` inside an RSC action; needed a `safeRedirect()` abstraction (referenced repeatedly, including a memory noting `#39`'s `getReader()`-on-null bug in the *client* runtime is a separate, still-open issue orthogonal to the rwsdk version).
- **Silent OTP failures**: `32d788c` (#48) — email send failures were swallowed and reported as success (Resend is a hard SPOF; this shipped ~2 weeks before this audit).
- **Cookie SameSite regression**: `96f253a` (#49) — `Strict` broke Stripe-return session continuity; needed `Lax` plus a long correctness comment justifying it's still CSRF-safe.
- **Rate-limit design tension**: `ca1570a` — OTP rate limit was IP-only, false-locked shared-NAT users (coffee shops, campus wifi); moved to per-email keying, but memory notes the IP-vs-email-vs-both tradeoff was never fully closed out.
- **Structural complexity**: full multi-org/membership/role model (`Organization`, `Membership`, invite tokens, "default org" resolution preferring `business` type, role-drift sync from DB every request) is live and exercised on *every login* for what the owner has described as a single-admin app with a frozen multi-vendor pivot. This isn't legacy-dead code — it's active, load-bearing logic that adds real surface area (extra DB writes, extra failure modes) for a feature that isn't being used.
- The volume of `fix(auth)`/`fix(session)` commits (at least 20 in git log) vs. feature commits in this area is itself a signal: auth has been the most repeatedly-patched subsystem in the repo.

---

## 2. Accreted subsystem inventory

| Subsystem | What it is | Reachable/used? | Verdict |
|---|---|---|---|
| `src/ai` (`workers-ai-client.ts`) | Thin wrapper around the Workers AI binding (`env.AI`) | Yes — used by `chat/ai-agent.ts`, `chat/durableObject.ts`, `api/voice-command.ts` | Keep only if chat/voice survive the rebuild scope decision; otherwise cut with them |
| `src/mcp` (`durableObject.ts`) | Per-org `McpDurableObject`: SQLite-backed tool-call audit log, rate limiting, response cache, token budget tracking, and the actual MCP request handler. Also serves an *external*, spec-compliant MCP endpoint (`/mcp/:orgSlug`, `.well-known/mcp.json`) with API-key or session auth | Heavily used internally — every admin "catch/gaps/market" server function and the chat/voice agents route tool calls through this DO. External MCP protocol surface is separately reachable by any client | This is the largest, most sophisticated accreted subsystem — effectively a second backend (its own auth, its own SQLite schema, its own rate limiter) built to let AI agents (internal chat/voice *and* external MCP clients) act on the app. For a single-admin fish stand, this is enormous overkill. **Cut the external MCP surface**; if any chat/voice tool-calling survives, replace this DO with a plain in-process function-call dispatch — no need for a durable, persisted, rate-limited tool bus |
| `src/chat` | Customer-facing AI chat (`ChatSheet.tsx` on the home page, `BottomNavigation`) + admin-side inbox/reply UI (`AdminChatBubble`, `ConversationList`, `MessagesUI`) backed by `ChatDurableObject` (WebSocket) | Yes, reachable by customers (fab/chat sheet on home) and admin | Bolted-on per the brief. Keep only if "AI answers customer questions" is an explicit rebuild goal; otherwise cut — it drags in `src/ai`, `src/mcp`, `src/inbox`, `src/signal` as dependencies |
| `src/inbox` (`durableObject.ts`, `useInbox.tsx`) | Push-notification DO for admin: notifies the admin UI over WebSocket (`/ws/inbox/:orgId`) when a new chat message arrives | Yes, but only in service of `src/chat` | Cut alongside chat, or replace with simple polling if chat survives |
| `src/signal` (`durableObject.ts`) | "Demand intelligence" DO — ingests signals (from chat, voice) per-org, feeds the admin `/admin/insights` page | Yes — wired into `InsightsPage`/`insights/functions.ts`, `chat/durableObject.ts`, `api/voice-command.ts`, `api/mcp-tool-call.ts` | Product idea (per memory: NanoClaw-inspired signal agent) rather than dead code, but it's a fourth Durable Object class + its own storage schema serving one admin page. Cut unless demand-intelligence is an explicit rebuild requirement; a plain D1 table + query would do the same job with far less machinery |
| `src/api` | Grab-bag: `stripe-webhook.ts` (real, load-bearing), `catch-record.ts`/`voice-command.ts`/`voice-pipeline.ts`/`voice-tools.ts` (voice-driven catch updates via Workers AI + MCP tool calls), `mcp-server.ts`/`mcp-tool-call.ts`/`tool-handlers.ts` (MCP protocol implementation) | Stripe webhook: keep, essential. Voice + MCP: reachable (wired into `worker.tsx`) but niche — voice-command is a speech-to-catch-update feature for Evan | Keep `stripe-webhook.ts`. Voice pipeline is a nice-to-have for a one-person fish stand (typing a catch update is fine); cut unless Evan specifically uses it. MCP protocol files go with the MCP cut above |
| `agents` npm dep (Cloudflare Agents SDK, ^0.9.0) | — | **Zero references anywhere in `src/`** — only exists in `package.json` | Dead dependency. Remove |
| `capnweb` npm dep (~0.2.0) | RPC library, per CLAUDE.md meant for "internal communication" | **Zero references anywhere in `src/`** | Dead dependency. Remove |
| `@modelcontextprotocol/sdk` | Real MCP protocol implementation | Used by `src/api/mcp-server.ts`, `voice-tools.ts` | Keep only if MCP survives; else remove |
| `ralph.sh` / `ralph-once.sh` / `ralph-format.sh` | Autonomous Claude-Code coding-loop scripts ("Choo Choo Ralph") — run `bd` (a task/bead tool) tasks in a loop with priority filtering | Not referenced by `package.json` scripts or CI; last touched 2026-04-04 (stale, ~5 months as of this audit) | Dev-tooling, not app code — doesn't affect runtime or the rebuild decision either way. Fine to leave out of a fresh repo (they're project-management scripts, not product code); not a "cut for risk" item, just don't carry them forward as if load-bearing |

**Summary:** four Durable Object classes (`Mcp`, `Signal`, `Inbox`, plus `Chat` itself) and two unused npm packages exist to support an AI-chat/voice/demand-intelligence layer that's tangential to the two real jobs in scope (Evan manages catches/markets; customers browse/favorite/request). None of it is unreachable dead code — it's all wired up and would need deliberate removal, not just deletion of unused files.

---

## 3. Stack verdict

**Current:** RedwoodSDK 1.4.1 on Cloudflare Workers, pinned below 1.5.0 because 1.5.0–1.7.2 break `react-dom/server` resolution in the RSC/worker bundle under `vitest-pool-workers` (root-caused to rwsdk's Vite-6 compat shim; tracked, not yet fixed upstream as of 2026-08-30). Prisma + D1, 6 Durable Object classes, ~31k LOC across `src/`, 15 test files.

That LOC-to-userbase ratio (31k lines for one admin + browsing customers) is itself evidence the current stack/architecture invites accretion — RSC server components + server functions + DOs-for-everything is a lot of moving parts to keep RedwoodSDK's specific patterns straight, and the git history shows repeated whitescreen/redirect/session bugs that trace directly to RSC-server-action semantics (`e5c3132`, `#39`), not business logic.

### Options

**A. Stay on RedwoodSDK, upgrade path pending upstream fix.**
- Pro: Known quantity, RSC + server functions pattern is genuinely nice for the CRUD-heavy admin pages; migration cost is zero.
- Con: Stuck below 1.5.0 indefinitely (no fix ETA); every rwsdk-specific pattern (route middleware, `render()`, `defineDurableSession`, action redirects) has already caused at least one production bug class in this codebase. Framework is young/small-community — you're exposed to its bugs with no fallback.

**B. Plain Cloudflare Workers + a boring router (Hono) + server-rendered HTML (or islands), D1 via Prisma or raw SQL, no RSC.**
- Pro: Removes an entire class of bugs (RSC action semantics, whitescreen-on-redirect, Vite-compat-shim regressions). Hono is stable, huge community, trivial to reason about. You keep Cloudflare (Workers/D1/DO), which the app doesn't need to leave — D1 + DO for sessions are fine primitives.
- Con: Lose "server components fetch data inline" ergonomics; write a bit more plumbing for hydration/interactivity (though for this app's actual UI — browse, favorite, request — that's minimal).
- **This is the boring/low-maintenance option and the one I'd default to** given the owner's stated exhaustion with the current stack's failure modes and the app's actual scope (mostly-static browsing + two write-heavy forms + one admin dashboard).

**C. Next.js (or SvelteKit) on Cloudflare via their official adapters, D1 via Prisma.**
- Pro: Much larger ecosystem/community than rwsdk if you want RSC-style patterns without the small-framework risk; better docs, more Stack Overflow/LLM training data for debugging.
- Con: Heavier build tooling, Cloudflare adapter has its own edge cases, and you're still exposed to *some* RSC-related footguns (subset of what rwsdk has, but not zero) if you use App Router server components.

**Recommendation: Option B.** The owner's core complaint is fragility and maintenance pain, not missing features — the app's real UI needs (market list, favorites, a request form, an admin CRUD dashboard) don't require RSC's data-fetching ergonomics badly enough to justify staying exposed to a framework whose upgrade path is currently blocked and whose specific abstractions (server actions, `render()`, durable sessions) have generated the majority of this project's fix commits. Keep Cloudflare Workers/D1/DO (they're not the problem); drop RedwoodSDK for Hono + plain SSR or a minimal client-side hydration layer.

---

## 4. Recommended auth for the rebuild

Keep the one thing that already works well: **email-OTP has no real complaints in the git history once it stabilized** (the churn was earlier password/passkey/magic-link attempts, not the OTP mechanism itself). Don't reintroduce passkeys or magic links — this user base is 60+ and casual; OTP-by-email is already the right complexity level.

**Proposed shape:**

- **Evan (single admin):** one hardcoded/seeded admin account, email-OTP login, no org/membership/role model at all — just `isAdmin: boolean` on the one row, or even simpler, an env-var allowlisted email that unlocks `/admin`. No `Organization`/`Membership`/`Invite` tables, no role hierarchy, no "default org" resolution logic. This alone deletes most of the complexity documented in §1.
- **Customers — no browse-wall, no forced login:**
  - Default identity: **anonymous device token** — a signed, long-lived cookie (or `localStorage` value + a lightweight server-set cookie) minted on first visit, no email required. Sufficient for favoriting markets and submitting a fish request tied to "this browser."
  - **Optional upgrade to email-OTP** only when a customer wants their favorites/requests to follow them across devices, or wants order/request status via email. Same OTP mechanism as admin, reusing `login-codes.ts`'s pattern (hash+TTL+attempt-limit in D1) almost as-is.
  - No CSRF-token gymnastics tied to session rotation if sessions stay simple: a device-token cookie for anonymous state + a *separate*, much simpler session cookie only once OTP verifies (no rotation-preserving-arbitrary-fields dance, no org context to carry through rotation).
- **Session store:** a single Durable Object (or even just signed cookies with D1-backed revocation list) holding `{ userId | deviceToken, csrfToken }` — no `currentOrganizationId`, no `role`, no per-request DB membership re-validation.
- **Drop:** `Credential` model, `WEBAUTHN_*` env vars, all org/membership/invite plumbing, role-hierarchy permission helpers (replace with one `isAdmin` check).

This directly satisfies "no browse-wall" (anonymous-first), keeps the one proven-good mechanism (OTP) for the cases that need durable identity (admin, and customers who opt in), and eliminates the multi-tenant scaffolding that's been dead weight since the pivot was frozen.

---

Report written to `docs/audit/auth-platform.md`.
