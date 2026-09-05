# Fresh Catch — Rebuild Spec

Synthesized from `features.md`, `data-stripe.md`, `auth-platform.md`, `ux-a11y.md`. Scrap current RWSDK app, rebuild from scratch on same Cloudflare primitives.

## 1. Product scope (keep-list only)

| # | Feature | Source |
|---|---|---|
| 1 | Mic → catch-of-week update → renders on customer landing hero | features.md §2 flow #1, §3 (regression root cause) |
| 2 | Customers browse/favorite/track markets Evan attends | features.md §2 flow #2 |
| 3 | Evan edits market details incl. popup markets, archive feed of past popups | features.md §2 flow #3, `/markets/past` |
| 4 | NEW: customer requests fish → saved + alerts Evan → he responds, app retains history | data-stripe.md §2 `FishRequest` (net-new, nothing today does this) |
| 5 | Customer-page look carries forward; admin theme scrapped | ux-a11y.md §1, §5 |
| 6 | A11y-first: AAA contrast, 48px targets, dark mode from day 1 | ux-a11y.md §2–4 |
| 7 | Drastically simpler auth | auth-platform.md §4 |
| 8 | Stripe live (keys+webhook, Connect active), payments optional-later | data-stripe.md §3 |

**Cut entirely** (all four audits agree): multi-org/membership/role/invite system, team management, branding settings, external MCP server + API keys, Gaps page, `/design-test` in prod, `agents`/`capnweb` deps, `Credential`/WebAuthn model + `WEBAUTHN_*`/`AUTH_SECRET_KEY`/`TURNSTILE_SECRET_KEY` config, the do-everything fab-bar `CommandBar` router.

**Carry the concept, not the code:** `VoiceMicButton`/`useVoiceRecorder` primitives and the draft→review→confirm UX pattern (features.md §4) — reuse for both catch-update mic and the new fish-request flow, scoped one-mic-one-job per screen (no shared intent router — this is what caused the #1 regression).

**Defer, decide later (not blocking rebuild):** orders/checkout UI, profile page, chat/inbox, insights/signal DO — real but not on the keep-list; ship v1 without them and revisit.

## 2. Root cause of the #1 regression (fix by construction, don't carry the bug forward)

Two compounding bugs (features.md §3):
- **A**: landing page silently falls back to a directory view unless exactly one `business`-type org exists — a leftover multi-tenant invariant. Rebuild has no multi-org concept at all, so this class of bug can't recur.
- **B**: two near-identical voice intents (`update_catch` vs `update_market_catch`) wrote to two different fields, only one of which the hero reads. Fix: single catch-update concept, single mic entry point (`/admin/catch`-equivalent), no global intent router guessing between overlapping tools.

## 3. Architecture + stack

**Recommendation: drop RedwoodSDK, keep Cloudflare (Workers, D1, Durable Objects).** Plain Workers + Hono, server-rendered HTML/islands, no RSC.

Why (auth-platform.md §3): rwsdk is pinned below 1.5.0 with no upstream fix ETA; its RSC-specific abstractions (server-action redirects, `render()`, durable-session merge semantics) directly caused the majority of this repo's fix commits (whitescreens, session clobbering, DO-eviction retries). 31k LOC for one admin + browsing customers is disproportionate, and the framework's failure modes — not business logic — drove that. Hono is stable, boring, huge community; D1/DO aren't the problem and stay.

Considered and rejected: staying on rwsdk (blocked upgrade, proven bug class); Next.js/SvelteKit on CF adapters (still carries a subset of RSC footguns, heavier tooling, no clear win over Hono for this app's actual UI needs — mostly-static browsing + two write-heavy forms + one admin dashboard).

## 4. Data model

Collapse multi-tenant shape to single-vendor (data-stripe.md §2). Drop `Organization`/`Membership`/`Invite`/`Credential` entirely.

```prisma
model Vendor {
  id                       String  @id @default(uuid())
  name                     String
  stripeAccountId          String?
  stripeOnboardingComplete Boolean @default(false)
  platformFeeBps           Int     @default(500)
  notificationEmail        String?
}

model User {
  id       String  @id @default(uuid())
  email    String?
  name     String?
  phone    String?
  isAdmin  Boolean @default(false)  // replaces org/role/membership entirely
  createdAt DateTime @default(now())
  requests FishRequest[]
  orders   Order[]
}

model Market {
  // unchanged from current — already minimal and correct
  id, name, schedule, subtitle, locationDetails, customerInfo, active
  type ("regular"|"popup"), expiresAt, catchPreview, notes, rawTranscript, cancelledAt
  county, city
}

model CatchUpdate {
  // unchanged — mic → catch-of-week pipeline already fits
  id, recordedBy, rawTranscript, formattedContent, status, timestamps
}

model FishRequest {   // NEW — the actual gap in the current app
  id            String   @id @default(uuid())
  userId        String?
  contactName   String
  contactEmail  String?
  contactPhone  String?
  species       String
  notes         String?
  status        String   @default("open")  // open | fulfilled | declined
  evanResponse  String?
  respondedAt   DateTime?
  createdAt     DateTime @default(now())
  user User? @relation(fields: [userId], references: [id])
  @@index([status])
  @@index([createdAt])
}

model Order { /* current fields minus organizationId; dormant until payments phase */ }
model Payment { /* unchanged, Stripe-webhook-written only */ }
model LoginCode { /* unchanged, OTP auth */ }
```

Favoriting/tracking markets (keep-list #2) is currently client-local (`useFavorites`, localStorage) — features.md flags this as worth confirming whether it needs to be account-linked. Recommend: keep localStorage-only for anonymous users, sync to `User` only once they opt into OTP (see auth below) — avoids forcing login just to favorite a market.

**Known prod cleanup, not code, do before/during migration:** 8 of 9 `Organization` rows are dead self-serve residue (data-stripe.md §1a) — don't carry forward, don't migrate. One stray "Test popup" market row live in prod — don't migrate. `evan-org-id-001.stripeOnboardingComplete = 0` vs. reported-active Connect — reconcile against Stripe dashboard before cutover (no API access in this audit to check).

## 5. Auth design

Per auth-platform.md §4 — the OTP mechanism itself has no real complaints once stabilized (churn was all earlier password/passkey/magic-link attempts). Keep it, strip everything around it:

- **Evan**: single hardcoded/env-allowlisted admin email, email-OTP login, `isAdmin: boolean` — no org/role/membership/invite machinery.
- **Customers**: no browse-wall. Anonymous device-token cookie by default (favorites, fish requests tied to "this browser"). Optional OTP upgrade only if they want cross-device continuity or status-via-email.
- **Session**: single DO or signed-cookie + D1 revocation list holding `{userId|deviceToken, csrfToken}` — no `currentOrganizationId`, no role, no per-request membership re-validation.
- Reuse `login-codes.ts`'s hash+TTL+attempt-limit pattern almost as-is — it's sound, just currently wired to an oversized identity model.
- Carry forward the fix from #49: session cookie must be `SameSite=Lax` (not `Strict`) to survive Stripe's cross-site return redirect.

## 6. Design system / a11y guide

Source of truth: `docs/audit/ux-a11y.md` §1 (full token set) and §4 (standards). Summary:

- Port core palette/type/spacing/radius tokens as-is (ux-a11y.md §1) — this is the liked visual identity. **Do not port** the 18+ ad-hoc `--color-glass-*`/`--tint-*`/`--nav-accent-*` layer; it's decorative and the root cause of dark-mode fragility.
- **Contrast**: adopt AAA (7:1) as the default bar, not AA. Use the darkened swap values computed in ux-a11y.md §2 (`text-secondary` → `#4C596A`, `text-tertiary` → `#627794`, `action-primary` default → `#0052A3`). Coral/mint/gold are fill-only, never text — use the `-text` AAA variants (`#B60000`/`#006553`/`#7C5005`) when a status must render as text.
- **Dark mode from day 1**: author every color as a light/dark pair at design time, not back-derived. Set `color-scheme: light dark` consistently (current app has a conflicting `light`-only meta tag that breaks native form-control theming — don't repeat). Never use raw `rgba(white/black, X)` — always a named semantic token with both values baked in.
- **Touch targets**: 48×48px floor, no exceptions for compact/footer variants (current 36px mic button and `size=sm` buttons fail this).
- **Type**: 16px minimum body, 14px floor for labels/captions/errors (current 12px is too small for the 60+ audience) — 16px preferred for error text.
- **Focus**: every focusable control gets a real `:focus-visible` ring wired at the component level, not opt-in per page.
- **Motion**: any infinite/looping animation must respect `prefers-reduced-motion`.
- Pages whose look must survive: `/` (landing hero), vendor profile, `/markets/past` archive, login — per ux-a11y.md §5.

## 7. Stripe integration plan

Per data-stripe.md §3 — carry forward the parts that work, drop multi-tenant plumbing:

- **Carry forward as-is**: `utils/stripe.ts` (Workers-compatible fetch client), webhook event-dispatch structure + `Payment.stripePaymentId` dedup logic, Connect Express onboarding flow (becomes "set up Evan's payout account," singular, not per-org).
- **Rebuild-fresh/simplify**: strip `orgId`/multi-tenant metadata resolution from the webhook handler — single vendor means no org lookup, just `orderId`.
- **Sequencing**: ship as a clean, flippable module (webhook + checkout) per the "payments optional later" brief — don't half-wire it mid-build. Keys + webhook configured and Connect active from day 1; checkout UI can lag.
- **Before cutover**: reconcile `stripeOnboardingComplete` flag (see §4), and manually check the Stripe dashboard for the "null evan org" test account and any sandbox/test-mode webhook endpoints — data-stripe.md couldn't verify either from D1/API access.

## 8. Phased build order

1. **Foundation**: Hono + Workers scaffold, D1 schema (§4), single-admin OTP auth (§5), design tokens + a11y primitives (§6) — Button/Input/focus-ring/dark-mode pairs built correctly from the start.
2. **Core keep-list**: market CRUD + popup markets + archive feed (#3); catch-update mic flow, single entry point, single DB field (#1) — this alone fixes the landing regression by construction.
3. **Customer landing**: hero rendering catch update, market browse/favorite (#2), device-token anonymous identity.
4. **New feature**: fish-request form → `FishRequest` table → alert-Evan (reuse `InboxDurableObject`-style push or simple polling) → response UI (#4).
5. **Stripe**: keys+webhook+Connect wired live (#8), checkout UI deferred/optional.
6. **Polish pass**: full a11y audit against ux-a11y.md §4 checklist before launch (contrast, targets, focus, motion).

## Open questions for Barrett
- Orders/checkout UI: keep as "order ahead," fold into fish-requests, or drop for v1? (features.md flags as undecided)
- Chat/inbox (`Conversation`/`Message`): keep as general customer↔vendor messaging alongside `FishRequest`, or let fish-requests fully replace it? Two systems currently overlap conceptually.
- Second admin login for Evan (helper/staff) — worth a flat `isAdmin` on a second `User` row, or truly solo?
- Dark mode: OS-driven only, or manual toggle? ux-a11y.md flags this as lower priority than daylight contrast for the outdoor-market use case — sequence accordingly?
- Reconcile Stripe: `stripeOnboardingComplete=0` in D1 vs. reported-active Connect, plus the "null evan org" test account / sandbox webhooks — needs Stripe dashboard access, not visible from this audit.
- Voice/AI chat/signal-demand-intelligence (Mcp/Signal/Inbox/Chat DOs) — auth-platform.md calls this a second backend bolted onto a single-vendor app; confirm none of it is wanted in v1 rebuild scope.
