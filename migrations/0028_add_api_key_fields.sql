-- Migration: Add API key fields to Organization for external MCP access
-- Both fields nullable so existing orgs are unaffected

ALTER TABLE "Organization" ADD COLUMN "apiKeyHash" TEXT;
ALTER TABLE "Organization" ADD COLUMN "apiKeyPrefix" TEXT;
