-- Migration: Add payment tracking and friendly order numbers

-- Add order number (managed by application code per org)
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER NOT NULL DEFAULT 1;

-- Add payment tracking fields
ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;

-- Create index for order number lookups
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
