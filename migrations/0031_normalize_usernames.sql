-- Normalize legacy user login identifiers to trimmed-lowercase.
-- Pre-normalization accounts (mixed-case username/email) otherwise fail the
-- exact-match lookup in verifyOtp and silently fork a duplicate account.
-- New rows are already normalized on create, so this only touches legacy rows.
-- Will fail LOUDLY on a unique collision — which is the correct outcome
-- (two rows that normalize to the same value need manual resolution).
UPDATE "User" SET "username" = lower(trim("username")) WHERE "username" <> lower(trim("username"));
UPDATE "User" SET "email" = lower(trim("email")) WHERE "email" IS NOT NULL AND "email" <> lower(trim("email"));
