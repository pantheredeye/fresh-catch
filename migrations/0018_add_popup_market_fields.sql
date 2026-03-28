-- Add popup market fields to Market table
ALTER TABLE "Market" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE "Market" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "Market" ADD COLUMN "catchPreview" TEXT;
ALTER TABLE "Market" ADD COLUMN "notes" TEXT;
ALTER TABLE "Market" ADD COLUMN "rawTranscript" TEXT;
ALTER TABLE "Market" ADD COLUMN "cancelledAt" DATETIME;

-- Add composite index for popup market queries
CREATE INDEX "Market_organizationId_type_active_idx" ON "Market"("organizationId", "type", "active");
