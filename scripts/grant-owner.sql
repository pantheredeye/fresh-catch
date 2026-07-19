-- Grant a user the "owner" role on a business organization, by email + slug.
--
-- WHY THIS EXISTS
--   Everyone (Evan included) registers as a normal user via email->code login,
--   which creates only an individual account. Promoting someone to owner of a
--   BUSINESS org is a deliberate, owner-operated action — never seeded, never
--   automatic. `pnpm run seed` wipes all users; do NOT use it against prod.
--
-- USAGE
--   1. Edit the two literals marked  <-- EDIT  below (email + org slug).
--      They appear in the grant and in the verification query — change both.
--   2. Dry run against LOCAL first:
--        pnpm exec wrangler d1 execute DB --local  --file scripts/grant-owner.sql
--   3. When it looks right, run against PROD:
--        pnpm exec wrangler d1 execute DB --remote --file scripts/grant-owner.sql
--
-- NOTES
--   - Idempotent: if the user already has a membership in that org, the role is
--     upgraded to owner (never duplicated).
--   - No-op (zero rows, no error) if the email or business slug does not match —
--     check the verification output at the end to confirm the grant landed.
--   - email matches User.username; org slug matches Organization.slug.
--   - Timestamps use Prisma's ISO-8601 UTC text format so Prisma reads them back
--     correctly (SQLite CURRENT_TIMESTAMP would not match).

WITH params AS (
  SELECT
    'evan@example.com' AS email,      -- <-- EDIT: the user's login email
    'evan'             AS org_slug    -- <-- EDIT: the business org slug
)
INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(16))),
  u."id",
  o."id",
  'owner',
  strftime('%Y-%m-%dT%H:%M:%f', 'now') || '+00:00',
  strftime('%Y-%m-%dT%H:%M:%f', 'now') || '+00:00'
FROM params p
JOIN "User" u
  ON u."username" = p.email AND u."deletedAt" IS NULL
JOIN "Organization" o
  ON o."slug" = p.org_slug AND o."type" = 'business'
ON CONFLICT ("userId", "organizationId")
DO UPDATE SET "role" = 'owner', "updatedAt" = excluded."updatedAt";

-- Verification — should print one row with role = owner.
SELECT u."username" AS email, o."name" AS org, o."slug", m."role"
FROM "Membership" m
JOIN "User" u ON u."id" = m."userId"
JOIN "Organization" o ON o."id" = m."organizationId"
WHERE u."username" = 'evan@example.com'   -- <-- EDIT: same email as above
  AND o."slug"     = 'evan';               -- <-- EDIT: same slug as above
