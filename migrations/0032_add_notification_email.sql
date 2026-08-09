-- Migration: Add notificationEmail to Organization for per-org order notifications
-- Nullable, existing orgs unaffected

ALTER TABLE "Organization" ADD COLUMN "notificationEmail" TEXT;
