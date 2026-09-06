-- Cutover data import for v2 — run at G4 (docs/CUTOVER.md), after
-- migrate:prd and after running export-v1.sh.
--
-- The Vendor row below has fixed, known values — it's ready to run as-is.
-- The Market/CatchUpdate/User INSERTs are ONE EXAMPLE ROW EACH, shaped from
-- the real column list in export-v1.sh's queries. Hand-author (and
-- hand-review) the rest from scripts/cutover/export/{market,catchupdate,user}.json
-- before running this file — do not run it with the example rows still in
-- place. SQLite booleans are 0/1 integers (Prisma's mapping).
--
-- Do-not-migrate (docs/audit/data-stripe.md §1a, REBUILD-PLAN.md §4):
--   - Organization x9 / Membership / Invite / Credential / ShareEvent — v2
--     has no target table for any of these; nothing to transcribe.
--   - The "Test popup" Market row (schedule "This weekemd", a manual test,
--     see data-stripe.md §3) — skip it when transcribing market.json.
--   - Orders (6) / Conversations (4) + Messages (19) / Payment / LoginCode —
--     dropped per the plan-review comment on issue #61 ("app isn't in prod
--     yet, still testing — fake test data"). Do not migrate.

-- One row, fixed values — not from export-v1.sh, new to v2's schema.
INSERT INTO Vendor (id, name, stripeAccountId, stripeOnboardingComplete, platformFeeBps, notificationEmail)
VALUES (
  lower(hex(randomblob(16))),
  'Fresh Catch',
  NULL, -- Evan has NO real Connect account yet (2026-09-06); the old
        -- acct_1U6UxbIM9hQlA7cd was the test-sandbox link, don't carry it.
        -- Set after launch via docs/CUTOVER.md "Stripe enablement".
  0, -- stays 0 until Evan's real Connect onboarding completes post-launch.
  500,
  NULL -- TODO: Evan's notification email (same address as the ADMIN_EMAILS entry in wrangler.jsonc)
);

-- Market — EXAMPLE ROW. Same columns as v1 minus organizationId (single
-- vendor now). Repeat for each real row in market.json except "Test popup".
INSERT INTO Market (id, name, schedule, subtitle, locationDetails, customerInfo, active, createdAt, updatedAt, type, expiresAt, catchPreview, notes, rawTranscript, cancelledAt, county, city)
VALUES (
  'REPLACE-WITH-id-FROM-market.json',
  'REPLACE-WITH-name',
  'REPLACE-WITH-schedule',
  NULL, -- subtitle
  NULL, -- locationDetails
  NULL, -- customerInfo
  1,    -- active
  'REPLACE-WITH-createdAt',
  'REPLACE-WITH-updatedAt',
  'regular', -- type: "regular" | "popup"
  NULL, -- expiresAt (popup only)
  NULL, -- catchPreview
  NULL, -- notes
  NULL, -- rawTranscript
  NULL, -- cancelledAt
  NULL, -- county
  NULL  -- city
);

-- CatchUpdate — EXAMPLE ROW. Same columns as v1 minus organizationId.
-- Repeat for each real row in catchupdate.json.
INSERT INTO CatchUpdate (id, recordedBy, rawTranscript, formattedContent, status, createdAt, updatedAt)
VALUES (
  'REPLACE-WITH-id-FROM-catchupdate.json',
  NULL, -- recordedBy
  'REPLACE-WITH-rawTranscript',
  'REPLACE-WITH-formattedContent', -- JSON string: { headline, items[], summary }
  'archived', -- status: "live" | "archived" — see note below
  'REPLACE-WITH-createdAt',
  'REPLACE-WITH-updatedAt'
);
-- Note: at most one CatchUpdate should carry status='live' across the whole
-- table (queries.ts picks "the" live one) — if v1 has more than one, archive
-- all but the newest when transcribing.

-- User — EXAMPLE ROW. v1's username/delivery*/deletedAt have no v2 column
-- (dropped — single-vendor schema, no delivery/guest-checkout fields carried
-- over). isAdmin=1 only for the two rows matching wrangler.jsonc's
-- ADMIN_EMAILS (Barrett + Evan); 0 for the other four. Repeat for each real
-- row in user.json.
INSERT INTO User (id, email, name, phone, isAdmin, createdAt)
VALUES (
  'REPLACE-WITH-id-FROM-user.json',
  NULL, -- email (nullable in v2 — v1's `username` doesn't carry over)
  NULL, -- name
  NULL, -- phone
  0,    -- isAdmin: 1 only for Barrett's and Evan's rows
  'REPLACE-WITH-createdAt'
);
