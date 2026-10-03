# Features Audit — Routes, Keep-Flows, and the Catch-Update Regression

Scope: `src/worker.tsx` route tree, every page/server-function in `src/app/**`, the mic → catch-update → landing-page flow, and the fab-bar/chat bolt-on. Read-only; no fixes applied.

## 1. Route inventory (from `src/worker.tsx:439-484` + each `routes.ts`)

### Public / customer (`CustomerLayout`)
| Route | Component (file) | Purpose | Verdict |
|---|---|---|---|
| `/` | `CustomerHome` (`src/app/pages/home/CustomerHome.tsx:18`) | Resolves org (via `?b=` or single-business auto-detect), redirects to `/v/:slug` or shows directory | **Keep** (core landing, but see §3 for the single-business assumption it relies on) |
| `/v/:slug` | `VendorProfilePage` (`src/app/pages/home/VendorProfilePage.tsx:13`) | Actual customer home render for a resolved vendor — markets, popups, catch hero | **Keep** — this is the real landing page for keep-list #1/#2 |
| `/design-test` | `DesignTest` | Dev-only design-system showcase, tree-shaken from prod via `isViteDev` (`worker.tsx:43-44,452-456`) | Kill from a rebuild (dev tooling, not product) |
| `/orders/new`, `/orders/` | `NewOrderPage`, `CustomerOrdersPage` (`src/app/pages/orders/routes.ts`) | Customer fish ordering + order history, Stripe-backed | **Maybe** — real transactional feature (guest checkout, payments), not on your 4-item keep-list but not multi-vendor/admin cruft either. Flag for a decision: keep as "order ahead," or drop in favor of the planned request/alert flow? |
| `/profile/` | `ProfilePage` | Customer account/profile | Maybe — thin, likely fine to keep or fold into login |
| `/markets/past` | `PastPopupsPage` (`src/app/pages/markets/PastPopupsPage.tsx:13`) | Public archive feed of expired popups | **Keep** — this is the "archive feed" from keep-list #2/popup markets |

### Auth (`AuthLayout`)
| Route | Purpose | Verdict |
|---|---|---|
| `/login` | Email-OTP login (`src/app/pages/user/LoginPage.tsx`) | Keep |
| `/join/invite` | `AcceptInvitePage` — team invite acceptance | Kill-candidate: team/multi-user invite flow only matters if multi-manager support survives the rebuild; Evan is a solo vendor per the brief |
| `/logout` | Session teardown, `src/app/pages/user/routes.ts:9-27` (has a documented SameSite=Lax GET-logout CSRF mitigation) | Keep |

### Admin (`/admin/*`, gated by `hasAdminAccess` at `worker.tsx:469-480`)
| Route | Component | Purpose | Verdict |
|---|---|---|---|
| `/admin` | `AdminDashboard` | Nav-card landing | Keep shell, but "admin is hated" — rebuild should shrink this, not reproduce it |
| `/admin/config` | `MarketConfigPage` (`src/app/pages/admin/MarketConfigPage.tsx:7`) | Create/edit markets + popups | **Keep** — this is keep-list #3 |
| `/admin/catch` | `CatchPage` (`src/app/pages/admin/catch/CatchPage.tsx:7`) | Dedicated mic/text catch-of-the-week editor | **Keep** — this is keep-list #1's primary UI |
| `/admin/orders`, `/admin/orders/print` | `AdminOrdersPage`, `PrintOrdersPage` | Order management + kitchen-printable list | Maybe, tied to the orders verdict above |
| `/admin/settings/stripe` | `StripeSettingsPage` | Stripe Connect onboarding | Keep if orders/payments survive |
| `/admin/settings/branding` | `BrandingSettingsPage` | Accent color only | Kill-candidate — single-vendor app doesn't need brandable multi-tenant theming |
| `/admin/settings/api` | `ApiSettingsPage` | External MCP API key management | **Kill** — multi-vendor/platform cruft (API keys are for third-party MCP clients hitting `/mcp/:orgSlug`, not something a single fish seller needs) |
| `/admin/settings/notifications` | `NotificationSettingsPage` | Notification email config | Maybe — small, harmless |
| `/admin/team` | `TeamPage` | Manage owner/manager memberships | Kill-candidate, same reasoning as `/join/invite` |
| `/admin/messages` | `MessagesPage` | Admin side of the customer chat | Maybe, see §4 |
| `/admin/gaps` | `GapsPage` (`src/app/pages/admin/gaps/GapsPage.tsx:1`) | Reads `MCP_DURABLE_OBJECT.getGaps()` — logs of AI-assistant questions it couldn't answer | **Kill** — infrastructure for the abandoned AI-chat/MCP platform push, not a vendor-facing feature Evan asked for |
| `/admin/insights` | `InsightsPage` (`src/app/pages/admin/insights/InsightsPage.tsx:1`) | Reads `SIGNAL_DURABLE_OBJECT` — demand-signal analytics | **Maybe/Kill for v1** — this is the NanoClaw-style signal-agent groundwork (see memory `project_nanoclaw_signal_agent`), interesting for the planned "fish requests" feature but currently disconnected UI; don't rebuild the page, but the underlying Signal DO ingestion may be worth keeping as plumbing |

### Non-routed but load-bearing infra
- `/.well-known/mcp.json`, `/mcp/:orgSlug` (`worker.tsx:162-242`) — external MCP server for AI assistants. **Kill** for rebuild scope; it's the abandoned "AI chat for customers via third-party MCP clients" platform play, unrelated to the 4-item keep-list.
- `/ws/chat/:id`, `/ws/inbox/:orgId` (`worker.tsx:366-438`) — chat + admin inbox websockets, backing the fab-bar chat (§4).
- `/api/catch/record`, `/api/voice/command` (`worker.tsx:356-364`) — the two competing voice-transcription endpoints central to §3.

## 2. Keep-flows traced end to end

**#1 Mic → catch-of-the-week → landing page (intended design, when it works):**
1. Admin taps mic in `CatchUI` (`src/app/pages/admin/catch/CatchUI.tsx:118-127`) → records → `POST /api/catch/record`.
2. `handleCatchRecord` (`src/api/catch-record.ts:33-40`) transcribes/formats via Workers AI, returns a draft — **no DB write yet**.
3. Admin reviews/edits, taps Publish → `publishCatch()` server action (`src/app/pages/admin/catch/catch-functions.ts:27-56`): archives old `catchUpdate` rows for `ctx.currentOrganization.id`, inserts new one with `status: "live"`.
4. Landing page read: `fetchVendorData(orgId)` (`src/app/pages/home/fetchVendorData.ts:53-67`) queries `db.catchUpdate` for `status: "live"` on the same org id, applies a 7-day staleness cutoff.
5. `VendorProfilePage` (`src/app/pages/home/VendorProfilePage.tsx:23-33`) passes `catchData` into `CustomerHomeUI`, which renders `FreshSheet` when `catchData` is truthy, else `FreshHero` (`src/app/pages/home/CustomerHomeUI.tsx:113-116`).

This chain is internally consistent — see §3 for why it still breaks.

**#2 Customers see/favorite/track markets:**
`fetchVendorData` also returns `markets` (regular) and `popups` (`fetchVendorData.ts:16-51`), rendered via `MarketCard`/`PopupCard`/`CompactMarketRow` in `CustomerHomeUI.tsx`. Favoriting is client-local via `useFavorites` (`src/hooks/useFavorites`, referenced `CustomerHomeUI.tsx:3`) — worth confirming in a rebuild whether "track" needs to be server-persisted (currently looks localStorage-only, not account-linked).

**#3 Evan edits markets incl. popups:**
`MarketConfigPage` (`src/app/pages/admin/MarketConfigPage.tsx:7-37`) → `MarketConfigUI` → `market-functions.ts` server actions (create/update/create-popup, `src/app/pages/admin/market-functions.ts`), writing directly to `db.market`. Straightforward, single well-defined path — no fork here, unlike catch updates.

## 3. Root cause: mic catch-of-the-week update no longer renders on landing page

Two independent findings, both grounded in code, either of which — separately or together — would produce "manager records an update, customer never sees it":

**A. The whole customer landing page silently stops resolving to Evan at all if more than one `type: "business"` `Organization` row exists.**
- `CustomerHome` (`src/app/pages/home/CustomerHome.tsx:40-53`) only redirects to `/v/:slug` when `getPublicOrganization()` finds **exactly one** business org (`src/utils/organization.ts:16-27`, `businesses.length !== 1` → `null`).
- If it returns `null`, `CustomerHome` falls through to `getPublicOrganizations()` and renders `VendorDirectory` instead (`CustomerHome.tsx:43-47`) — the catch-of-the-week hero is never reached, regardless of whether the DB write succeeded.
- `PastPopupsPage.tsx:29-34` has the identical "exactly one business org" assumption, so this isn't a one-off — it's a systemic invariant baked into every customer-facing page from the single-vendor era.
- This app's history is "single-vendor → abandoned multi-vendor pivot." That pivot is exactly the kind of change that leaves stray `type: "business"` org rows (test vendors, demo tenants) in the DB. I can't inspect production D1 rows from static analysis, but this is the most direct code-level explanation for a *global* landing regression, and it's cheap to confirm: `SELECT id, slug FROM Organization WHERE type='business'` — if that returns more than one row, this is the cause.

**B. Even with org resolution intact, there are two different, ambiguous "catch update" voice intents, and only one of them renders on the hero.**
- The dedicated admin flow (§2, keep-list #1) writes `db.catchUpdate`, read by `fetchVendorData.ts:53-67` and rendered by `FreshSheet`.
- A second, separate voice tool — `update_market_catch` (registered `src/api/voice-tools.ts:348-362`, handled by `handleUpdateMarketCatch`, `src/api/tool-handlers.ts:569-610`) — writes to **`Market.catchPreview`** on a specific market row instead. That field is rendered only on individual `MarketCard`/`PopupCard`/`CompactMarketRow` components (`src/app/pages/home/components/MarketCard.tsx:106-108`, `PopupCard.tsx:100-107`, `CompactMarketRow.tsx:20-41`) — never merged into the `FreshHero`/`FreshSheet` hero.
- Both intents are reachable from the same global fab-bar mic (`CommandBar`, mounted in `AdminLayoutClient.tsx:141`) with near-identical natural-language hints — `HINT_CONTEXTS.catch = ["what's fresh today", "update the catch"]` (`src/components/CommandBar.tsx:12`) vs. `update_market_catch`'s description "Update what fish are available at a specific market" (`voice-tools.ts:349`). The AI tool-resolution step (`buildSystemPrompt`/Workers-AI call in `src/api/voice-command.ts`) picks one tool per utterance with no confirmation step for *which* concept ("today's overall catch" vs. "this one market's catch") the manager meant.
- Net effect: if a manager uses the **fab-bar mic** (not the dedicated `/admin/catch` page) and the model resolves to `update_market_catch`, the update is saved successfully (no error surfaced) but lands on a per-market field the landing hero never reads — matching the reported symptom exactly ("update... no longer renders on the landing page," not "update fails").

**Recommendation for the rebuild, not applied here:** collapse to a single catch-update concept and a single entry point (the dedicated `/admin/catch` mic flow already does this well); if a global fab-bar mic survives, drop or clearly separate the market-specific catch-preview intent so it can't silently substitute for the landing-page catch update. Also verify/enforce the single-business-org invariant explicitly (e.g., a startup check) rather than relying on `.length !== 1` silently degrading to a directory view.

## 4. Fab bar + chat — what's worth carrying forward

Components: `CommandBar.tsx`, `CommandReview.tsx`, `VoiceCommandContext.tsx` (global voice/text command sheet + review-before-save UI); `ChatDurableObject`, `AdminChatBubble`/`AdminChatSheet`/`ChatThread`/`ConversationList` (admin side), `ChatSheet`/`ChatQuickActions`/`NamePrompt` (customer side); `InboxDurableObject` + `useInbox` (admin push notifications for new messages).

- **Worth keeping:** the `VoiceMicButton` + `useVoiceRecorder` primitives (`src/components/VoiceMicButton.tsx`, `src/hooks/useVoiceRecorder`) are shared by both the catch mic and the fab bar — solid, reusable, not tied to multi-vendor cruft.
- **Worth keeping (conceptually):** the review-before-save pattern in `CommandReview.tsx` (draft → editable form → confirm) is the right UX shape for voice input in general and matches the planned "customer fish requests → save + alert Evan → respond" flow — a request could reuse this same draft/review/confirm shape.
- **Worth keeping (plumbing):** `ChatDurableObject` + websocket chat is a reasonable foundation for the planned request/respond flow if you want it conversational; `InboxDurableObject` for push-alerting Evan is directly reusable for "alert Evan" in the planned feature.
- **Kill/replace:** the general-purpose `CommandBar` as an AI-tool-router for *everything* (markets, orders, messages, catch, market-catch — 9+ intents in `voice-tools.ts`) is the direct cause of §3's ambiguity and is almost certainly part of why "admin is hated" — too many overlapping ways to do the same thing, low-confidence AI intent guessing surfaced as a confusing review screen (`ConfidenceWarning` in `CommandReview.tsx:730-784`). A rebuild should scope voice input per-page (mic only does one thing per screen, like `/admin/catch` already does) rather than one global command router.
- **Kill:** the MCP server/external-API surface (`/mcp/:orgSlug`, API keys, `GapsPage`, `toolRegistry` shared with external clients) — this is platform-for-other-developers scope, not vendor- or customer-facing product.

## 5. Summary verdict counts
- Keep: landing (`/`, `/v/:slug`), catch mic flow, market/popup config, past-popups archive, login/logout.
2. Maybe (needs a product decision, not clearly cruft): orders/Stripe checkout, profile, notifications settings, admin messages/chat, insights/signal plumbing.
3. Kill (multi-vendor/admin/platform cruft): design-test route, team/invite, branding settings, API settings, gaps page, MCP external-server surface, the "everything" command-bar router.
