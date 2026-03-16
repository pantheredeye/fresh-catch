-- Migration: Drop paymentStatus column
-- paymentStatus is now derived from amountPaid/price via getPaymentStatus()

-- RedefineTables
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Order" AS SELECT
  id, userId, organizationId, orderNumber,
  contactName, contactEmail, contactPhone,
  items, preferredDate, notes, status,
  price, priceInCents, platformFeeRate, platformFee, totalDue,
  amountPaid, depositAmount,
  stripeCheckoutSessionId, stripePaymentIntentId,
  paymentMethod, paymentNotes, paidAt,
  createdAt, updatedAt
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

-- Recreate indexes
CREATE UNIQUE INDEX "Order_orderNumber_organizationId_key" ON "Order"("orderNumber", "organizationId");

PRAGMA foreign_keys=ON;
