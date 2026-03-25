-- Migration: Add Stripe integration, Payment model, and pricing fields
-- Handles: Organization payment config, Order pricing fields, price TEXT->INT conversion, Payment table

-- ============================================================
-- 1. Organization: Stripe Connect and fee configuration
-- ============================================================
ALTER TABLE "Organization" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "platformFeeBps" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "Organization" ADD COLUMN "defaultDepositBps" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "feeModel" TEXT NOT NULL DEFAULT 'customer';

-- ============================================================
-- 2. Order: New pricing and Stripe fields
-- ============================================================
ALTER TABLE "Order" ADD COLUMN "tipAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "platformFeeBps" INTEGER;
ALTER TABLE "Order" ADD COLUMN "platformFee" INTEGER;
ALTER TABLE "Order" ADD COLUMN "totalDue" INTEGER;
ALTER TABLE "Order" ADD COLUMN "amountPaid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "depositAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "stripeCheckoutSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT;

-- ============================================================
-- 3. Order: Convert price column from TEXT to INTEGER
-- SQLite does not support ALTER COLUMN, so we use the rename-and-recreate pattern
-- ============================================================
ALTER TABLE "Order" RENAME COLUMN "price" TO "price_old";
ALTER TABLE "Order" ADD COLUMN "price" INTEGER;

-- Migrate existing price data: attempt to cast text values to integer cents
-- Existing prices were stored as display strings (e.g., "45.00" or "45")
-- We multiply by 100 to convert dollars to cents, handling both formats
UPDATE "Order" SET "price" = CAST(CAST("price_old" AS REAL) * 100 AS INTEGER) WHERE "price_old" IS NOT NULL AND "price_old" != '';

ALTER TABLE "Order" DROP COLUMN "price_old";

-- ============================================================
-- 4. Payment table
-- ============================================================
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
