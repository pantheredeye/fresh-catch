-- Migration: Drop paymentStatus column
-- paymentStatus is now derived from amountPaid/totalDue via getPaymentStatus()

-- RedefineTables
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Order" AS SELECT
  id, orderNumber, userId, organizationId,
  contactName, contactEmail, contactPhone,
  items, preferredDate, notes,
  status, price, adminNotes,
  tipAmount, platformFeeBps, platformFee, totalDue,
  amountPaid, depositAmount,
  stripeCheckoutSessionId, stripePaymentIntentId,
  paymentMethod, paymentNotes, paidAt,
  createdAt, updatedAt
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

-- Recreate indexes
CREATE UNIQUE INDEX "Order_orderNumber_organizationId_key" ON "Order"("orderNumber", "organizationId");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

PRAGMA foreign_keys=ON;
