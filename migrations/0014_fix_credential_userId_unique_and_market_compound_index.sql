-- Migration: Fix Credential userId unique constraint + add Market compound index
-- 1. Remove @unique from Credential.userId — WebAuthn allows multiple devices per user
-- 2. Add compound index on Market(organizationId, active) for filtered queries

-- Drop the unique index on userId (keep the regular @@index)
DROP INDEX IF EXISTS "Credential_userId_key";

-- Add compound index for active-market-by-org lookups
CREATE INDEX IF NOT EXISTS "Market_organizationId_active_idx" ON "Market" ("organizationId", "active");
