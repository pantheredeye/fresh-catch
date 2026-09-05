# Data + Stripe Audit (Lane 2/4)

Read-only. Schema/migrations reviewed statically; prod D1 (`digitalglue-market`,
`71d2e8c4-b9a8-48ea-9fc5-550a9206ea61`) queried live via `wrangler d1 execute --remote`
(SELECT only, no writes) to ground dead-code calls in real data.

## 1. Prisma models — used or dead?

| Model | Status | Usage | Prod rows |
|---|---|---|---|
| `User` | **keep** | core; email-OTP auth, orders, memberships | 6 |
| `Credential` | **dead** | legacy WebAuthn, "no longer wired up" per CLAUDE.md. No `db.credential.*` call in `src/` outside `seed.ts` (which only deletes rows). | 1 (orphaned leftover) |
| `Organization` | **keep, but shape is multi-tenant** | still the tenant root for markets/orders/catch/chat. Only 1 org matters (`evan-org-id-001`); see §1a. | 9 (8 are dead self-serve orgs) |
| `Market` | **keep** | `src/app/pages/admin/market-functions.ts`, home feed, popup fields (`type`, `expiresAt`, `catchPreview`, `rawTranscript`) all live | 4 (3 real + 1 "Test popup") |
| `Membership` | **keep, shape questionable** | `src/app/pages/user/org-functions.ts`, `functions.ts`, `orders/claims.ts`, `admin/team/*`, `auth/invites.ts`. Currently used for two purposes conflated: (a) Evan's team (owner/manager) and (b) auto-created customer↔org link on order/claim. See §1a. | 8 |
| `Order` | **keep** | orders addon, `orders/functions.ts`, `admin/order-functions.ts`, checkout | 6 (0 have gone through Stripe) |
| `Payment` | **keep** | written only by `src/api/stripe-webhook.ts` (Stripe path) — no cash/venmo/zelle payment ever recorded via UI despite `method` supporting them; check if that admin UI exists | 0 |
| `ShareEvent` | **borderline** | write path exists (`src/app/pages/home/share-functions.ts`), never triggered in prod | 0 |
| `Invite` | **keep, but scope questionable** | team invite flow (`auth/invites.ts`, `admin/team/*`) — invites *managers* into Evan's org. Only matters if multi-user admin access is in scope for rebuild. | 4 |
| `CatchUpdate` | **keep — core keep-list feature** | mic → catch-of-week pipeline: `admin/catch/catch-functions.ts`, `home/fetchVendorData.ts`, `api/mcp-server.ts`, `api/tool-handlers.ts` | 11 (active) |
| `Conversation` / `Message` | **keep — active** | customer↔vendor chat/inbox: `src/chat/*`, `src/inbox/durableObject.ts`, `admin/messages/MessagesPage.tsx`. Closest existing analog to the new "fish requests" feature — see §2. | 4 convos / 19 msgs |
| `LoginCode` | **keep** | OTP auth, `auth/login-codes.ts`, `auth/otp-send.ts` | 1 |

### 1a. Multi-tenant residue confirmed live in prod

Every non-Evan signup auto-creates its own personal `Organization` (name = `"<email>'s
Account"`, random `slug` UUID) via whatever flow backs registration, **and** a
`Membership` row granting that user `customer`/`manager` access to `evan-org-id-001`.
8 of 9 `Organization` rows in prod are this dead self-serve residue — zero `stripeAccountId`,
zero real markets/orders. This is the abandoned multi-vendor pivot's signup path still
running live. A rebuild should hard-code the single vendor (no org-per-signup), which
collapses `Organization`+`Membership` into a much smaller shape (see §2).

Evan's real org (`evan-org-id-001`) has `stripeAccountId = acct_1U6UxbIM9hQlA7cd` but
**`stripeOnboardingComplete = 0`** in the DB — worth reconciling with the "Connect
activated" status mentioned in the task brief; either the `account.updated` webhook
hasn't landed since activation or this flag is stale. Verify in Stripe dashboard.

## 2. Proposed minimal target data model

Drop org-per-user entirely; Evan is the only vendor, so `Organization`/`Membership`
collapse to a singleton config row (or disappear — a single `Vendor` settings row is
enough, keep table only if multi-admin login is wanted for Evan's help).

```prisma
model Vendor {
  id                       String  @id @default(uuid())
  name                     String
  // Stripe Connect (dormant until payments phase)
  stripeAccountId          String?
  stripeOnboardingComplete Boolean @default(false)
  platformFeeBps           Int     @default(500)
  notificationEmail        String?
}

model User {
  id       String  @id @default(uuid())
  username String  @unique
  email    String?
  name     String?
  phone    String?
  deliveryStreet/City/State/Zip/Notes String?
  deletedAt DateTime?
  createdAt DateTime @default(now())

  orders   Order[]
  requests FishRequest[]
}

model Market {
  // unchanged shape — already minimal and correct for keep-list
  id, name, schedule, subtitle, locationDetails, customerInfo, active
  type ("regular"|"popup"), expiresAt, catchPreview, notes, rawTranscript, cancelledAt
  county, city
}

model CatchUpdate {
  // unchanged — mic → catch-of-week already fits
  id, recordedBy, rawTranscript, formattedContent, status, timestamps
}

// NEW — the actual gap in the keep-list. Nothing today persists a
// customer ask + Evan's response as durable, queryable history.
model FishRequest {
  id            String   @id @default(uuid())
  userId        String?
  contactName   String
  contactEmail  String?
  contactPhone  String?
  species       String   // what they're asking for
  notes         String?
  status        String   @default("open") // open | fulfilled | declined
  evanResponse  String?  // Evan's reply text
  respondedAt   DateTime?
  createdAt     DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])
  @@index([status])
  @@index([createdAt])
}

// Payments-optional-later: keep Order/Payment shape close to current,
// just drop organizationId (single vendor) and platformFee/Connect fields
// stay dormant until payments are turned back on.
model Order { /* current fields minus organizationId, platformFeeBps snapshot kept as-is */ }
model Payment { /* unchanged */ }

model LoginCode { /* unchanged, keep-list auth */ }
```

Notes:
- `Credential` — drop entirely, don't carry forward.
- `Invite`/`Membership`/multi-org `Organization` — drop entirely unless Evan explicitly wants a second admin login; if so, replace with a flat `admin` boolean or role field on `User` rather than the full org/membership/invite machinery.
- `ShareEvent` — low-value, zero prod usage; drop unless share analytics becomes a real ask.
- `Conversation`/`Message` (chat) — evaluate against `FishRequest`: today's chat is a general-purpose customer↔vendor inbox (AI-assisted); fish requests could be modeled as a typed message/thread instead of a new table if the rebuild keeps the chat system. Flagging for design-lane input rather than deciding unilaterally — the two features overlap conceptually (customer ask → Evan sees/responds → app remembers).
- Existing "Gaps" feature (`admin/gaps/*`, `McpDurableObject.getGaps`) already logs unmet-demand signals but lives in **Durable Object storage, not D1** — not relationally queryable, no persistent "Evan's response" field. Rebuild should likely replace/merge this with `FishRequest` rather than keep two parallel demand-signal systems.

## 3. Stripe audit

**What exists today:**
- `src/utils/stripe.ts` — Workers-compatible client factory (fetch-based HTTP client, Web Crypto for webhook verify). Carries forward as-is.
- **Connect onboarding** (Express accounts): `src/app/pages/admin/stripe-functions.ts:16` `createConnectedAccount`, `:56` `getOnboardingLink`, `:91` `checkOnboardingStatus`. UI: `StripeSettingsPage.tsx` / `StripeSettingsUI.tsx`.
- **Checkout** (destination charges, customer-initiated): `src/app/pages/orders/functions.ts:262` `createCheckoutSession` — builds line items (order total ± tip), `application_fee_amount` + `transfer_data.destination` to vendor's connected account, metadata `{platform: "fresh-catch", orderId, orgId}`.
- A second checkout-session creation exists admin-side: `src/app/pages/admin/order-functions.ts:152` (worth diffing the two call sites for drift before rebuild — didn't fully compare in this pass).
- **Webhook handler**: `src/api/stripe-webhook.ts` — standalone route (outside RWSDK middleware, to preserve raw body for signature verify). Handles `checkout.session.completed`, `payment_intent.succeeded` (backup/dedup'd against the first), `charge.refunded`, `account.updated` (syncs `stripeOnboardingComplete`). Dedup via `Payment.stripePaymentId` lookup. Always acks 200 even on handler error (correct — avoids Stripe retry storms).
- **Products**: none — line items built ad-hoc via `price_data`, no Stripe Product/Price catalog objects. Fine for this use case (variable per-order pricing).
- No cash/venmo/zelle payment-entry UI found wired to `Payment.method` despite schema supporting it — worth confirming with Evan whether manual payment logging exists anywhere in admin.

**Carries forward vs. rebuild-fresh:**
- Carry forward: `utils/stripe.ts`, the webhook handler's event-dispatch structure and dedup logic, the Connect onboarding flow (once single-vendor — this becomes "set up Evan's payout account" instead of per-org).
- Rebuild-fresh: strip `orgId`/multi-tenant metadata resolution (`resolveOrgFromMetadata`, `stripe-webhook.ts:74`) down to single-vendor — no org lookup needed, just `orderId`. Simplifies webhook handler meaningfully.
- Given "payments optional later" in the keep-list, recommend the rebuild ship Stripe as a clean cutover module (webhook + checkout) that can be flipped on later, not maintained mid-build.

**Cleanup items requested for verification:**
- *"Stray test account with null evan org"* — no orphaned FK found in D1 (checked `Membership`→`Organization` and `User`→`Membership` joins, both clean). What **is** confirmed live: 8 of 9 `Organization` rows are dead self-serve accounts from the multi-tenant signup path (barrett/michael test emails, all `stripeAccountId = null`), per §1a. If "null evan org" refers to something Stripe-side (e.g., a Connect test account not tagged with Evan's `orgId` metadata), **that needs the Stripe dashboard — no Stripe API/MCP access in this session to check.**
- *"Sandbox webhooks to delete"* — webhook endpoints are configured in the Stripe dashboard, not in this repo/DB. **Same limitation — could not verify; needs manual dashboard check** (Developers → Webhooks, look for any endpoint pointing at a non-prod URL or still in test mode alongside the live one).
- Also flagging (found, not requested): a `"Test popup"` `Market` row (`type: popup`, schedule "This weekemd" — typo, clearly a manual test) live in prod — cosmetic but visible to real customers if popups surface on the storefront.
- Also flagging: `evan-org-id-001.stripeOnboardingComplete = 0` in D1 despite Connect reportedly activated — reconcile.

## 4. Env vars / secrets / bindings (names only)

**`wrangler.jsonc` `vars`** (plaintext, non-secret):
`WEBAUTHN_APP_NAME`, `WEBAUTHN_RP_ID`, `ADMIN_EMAIL`, `APP_URL`, `NODE_ENV`

- `WEBAUTHN_APP_NAME` / `WEBAUTHN_RP_ID` — **dead**, no reference anywhere in `src/` (WebAuthn/Credential model unused). Drop from rebuild config.
- `ADMIN_EMAIL`, `APP_URL`, `NODE_ENV` — live, used (`orders/functions.ts`, `utils/email.ts`).

**Secrets** (via `wrangler secret put`, per `.env.example` / `src/utils/env.ts`):
- `STRIPE_SECRET_KEY` — required, live keys per task brief
- `STRIPE_WEBHOOK_SECRET` — required
- `RESEND_API_KEY` — required (treated as required in `REQUIRED_SECRETS`, though `utils/email.ts` also has a soft-skip path if absent — the two are slightly inconsistent, not a rebuild blocker)
- `AUTH_SECRET_KEY` — in `.env.example` only; **no reference found anywhere in `src/`**. Dead, drop.
- `TURNSTILE_SECRET_KEY` — in `.env.example`, commented "optional"; **no reference found in `src/`**. Dead/never wired up, drop unless bot protection is planned.

**Bindings** (`wrangler.jsonc`):
- `SESSION_DURABLE_OBJECT`, `CHAT_DURABLE_OBJECT`, `RATE_LIMIT_DURABLE_OBJECT`, `MCP_DURABLE_OBJECT`, `SIGNAL_DURABLE_OBJECT`, `INBOX_DURABLE_OBJECT` — all six referenced live in `src/` (session store, chat, rate-limit middleware, gaps/insights, signal agent, inbox). None dead.
- `DB` (D1), `AI` (Workers AI), `ASSETS` — all in active use.

No secret values were read or printed at any point in this audit.
