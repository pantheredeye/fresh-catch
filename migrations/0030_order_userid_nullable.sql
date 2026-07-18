-- Make Order.userId nullable: guest orders (AI chat today, guest checkout
-- later) have no user until claimed by email. Full table rebuild because
-- SQLite cannot drop NOT NULL in place. Existing "mcp-api" placeholder
-- userIds (no matching User row) become NULL.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE "new_Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderNumber" INTEGER NOT NULL,
  "userId" TEXT,
  "organizationId" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "items" TEXT NOT NULL,
  "preferredDate" DATETIME,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "price" INTEGER,
  "adminNotes" TEXT,
  "tipAmount" INTEGER NOT NULL DEFAULT 0,
  "platformFeeBps" INTEGER,
  "platformFee" INTEGER,
  "totalDue" INTEGER,
  "amountPaid" INTEGER NOT NULL DEFAULT 0,
  "depositAmount" INTEGER,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "paymentMethod" TEXT,
  "paymentNotes" TEXT,
  "paidAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Order" SELECT
  "id", "orderNumber",
  CASE WHEN "userId" IN (SELECT "id" FROM "User") THEN "userId" ELSE NULL END,
  "organizationId", "contactName", "contactEmail", "contactPhone", "items",
  "preferredDate", "notes", "status", "price", "adminNotes", "tipAmount",
  "platformFeeBps", "platformFee", "totalDue", "amountPaid", "depositAmount",
  "stripeCheckoutSessionId", "stripePaymentIntentId", "paymentMethod",
  "paymentNotes", "paidAt", "createdAt", "updatedAt"
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

CREATE UNIQUE INDEX "Order_organizationId_orderNumber_key" ON "Order"("organizationId", "orderNumber");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

PRAGMA defer_foreign_keys = OFF;
