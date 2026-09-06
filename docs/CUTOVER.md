# Cutover runbook — v2 → production

Prod today: worker `digitalglue-market`, D1 `digitalglue-market`
(`71d2e8c4-b9a8-48ea-9fc5-550a9206ea61`), custom domain `market.digitalglue.dev`.

v2: worker `fresh-catch-v2`, D1 `fresh-catch-v2` (`database_id` placeholder
until G1), no route yet.

**Strategy: new worker + new D1, then move the custom domain.** The v1
worker and its D1 stay deployed and untouched throughout, so rollback is
"point the domain back" — no data restore, no redeploy, no risk to v1.

Every step below is a **human gate** — run by Barrett (and Evan at G7) from
their own machine, with their own Cloudflare/Stripe credentials. No agent
session runs any of these commands; that's a hard rule for this repo (see
CLAUDE.md and the branch notes this doc was written from). This file, plus
`wrangler.jsonc`, `scripts/cutover/export-v1.sh`, and
`scripts/cutover/import-v2.sql`, are the prepared artifacts an agent session
*is* allowed to produce.

## Before you start

- `wrangler.jsonc`'s `vars.ADMIN_EMAILS` has a `__evan_email_todo__`
  placeholder — replace it with Evan's real login email before G5. It's an
  intentionally-invalid value so nothing accidentally matches it if it's
  missed.
- Decide whether `market.digitalglue.dev` is the right hostname for v2, or a
  new one — this runbook assumes the same hostname moves over (G6).

## G1 — create the D1 database

```bash
wrangler d1 create fresh-catch-v2
```

Paste the resulting `database_id` into `wrangler.jsonc`'s `d1_databases[0]`,
replacing `__replace_at_cutover__`.

## G2 — set secrets (payments-off launch: only these two)

```bash
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY
```

The three Stripe secrets are deliberately NOT set at launch: Evan has no
real Connect account yet (the audit-era `acct_1U6UxbIM9hQlA7cd` was the
test-sandbox link). With `STRIPE_SECRET_KEY` unset, the payments module
disables itself (`src/features/payments/config.ts` returns null) — request
threads and mark-paid-in-person still work. See "Stripe enablement" below
for turning payments on after Evan's review.

## G3 — Stripe reconcile — SKIPPED AT LAUNCH

Deferred to "Stripe enablement" below (payments off for this launch).
One piece remains now: delete any sandbox/test webhook endpoints still
configured in the Stripe dashboard, so nothing stale fires later.

## G4 — migrate schema, then import data

```bash
pnpm run migrate:prd
```

Then, from the still-live v1 worker's D1:

```bash
./scripts/cutover/export-v1.sh
```

This dumps `Market`, `CatchUpdate`, and `User` to
`scripts/cutover/export/*.json` — read-only, no writes to v1. Review those
files, then hand-author the real `INSERT`s in `import-v2.sql` (it currently
holds one example row per table plus the exact column mapping — see the
comments in that file for what's dropped and why). Do **not** run the file
with the example rows still in place.

Apply it to v2's new D1:

```bash
wrangler d1 execute fresh-catch-v2 --remote --file=scripts/cutover/import-v2.sql
```

Verify row counts match the exports (3 `Market`, minus the excluded "Test
popup" row; 11 `CatchUpdate`; 6 `User`; 1 `Vendor`):

```bash
wrangler d1 execute fresh-catch-v2 --remote --command \
  "SELECT (SELECT COUNT(*) FROM Market) m, (SELECT COUNT(*) FROM CatchUpdate) c, (SELECT COUNT(*) FROM User) u, (SELECT COUNT(*) FROM Vendor) v;"
```

**Not migrated** (deliberate — see `import-v2.sql`'s header comment):
`Organization`/`Membership`/`Invite`/`Credential`/`ShareEvent` (no v2 target
table), Orders (6) / Conversations (4) + Messages (19) / `Payment` /
`LoginCode` (dropped per the plan-review comment on issue #61 — v2 isn't in
production yet, these are fake test rows, not real customer history).

## G5 — deploy and smoke-test on workers.dev

```bash
wrangler deploy
```

No route is attached yet (see the comment in `wrangler.jsonc`), so this is
safe to run repeatedly without affecting `market.digitalglue.dev`. Smoke-test
on the `*.workers.dev` URL wrangler prints: home page loads, a market shows,
`/login` sends a code, `/admin` requires Evan's or Barrett's email.

## G6 — attach the custom domain

In the Cloudflare dashboard:

1. Workers & Pages → `digitalglue-market` → Settings → Domains & Routes →
   remove `market.digitalglue.dev`.
2. Workers & Pages → `fresh-catch-v2` → Settings → Domains & Routes → add
   `market.digitalglue.dev`.

Cloudflare won't let two Workers hold the same custom domain at once, so
there's a brief propagation window between steps 1 and 2 — do this at a
low-traffic hour. Once attached, smoke-test again on the real domain.

## G7 — done criterion

Evan logs in via OTP on `market.digitalglue.dev` and publishes a catch-of-
the-week update. Once that works, cutover is complete.

## Stripe enablement (post-launch, after Evan's review)

Payments stay off until Evan approves the app. Then:

1. Create Evan's real Connect Express account from the platform account and
   have him complete onboarding (the flow the audit's `data-stripe.md` §3
   describes, now singular).
2. In the dashboard, create the **Connect** webhook endpoint →
   `https://market.digitalglue.dev/webhooks/stripe`; capture `whsec_...`.
3. Set the three secrets (each `wrangler secret put` rolls a new worker
   version — no redeploy needed):

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_CONNECT_ACCOUNT_ID   # Evan's NEW acct_...
```

4. Update the Vendor row:

```bash
wrangler d1 execute fresh-catch-v2 --remote --command \
  "UPDATE Vendor SET stripeAccountId='acct_NEW', stripeOnboardingComplete=1;"
```

5. Verify: request thread → "Request payment" → test charge → webhook 200 →
   status paid → receipt.

## Rollback

Re-attach `market.digitalglue.dev` to `digitalglue-market` in the dashboard
(reverse of G6). The old worker and its D1 were never touched, so this is a
plain domain move back — no data restore needed.
