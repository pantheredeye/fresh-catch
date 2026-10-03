-- AlterTable
ALTER TABLE "FishRequest" ADD COLUMN "quotedPriceCents" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" INTEGER NOT NULL,
    "userId" TEXT,
    "requestId" TEXT,
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
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FishRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("adminNotes", "amountPaid", "contactEmail", "contactName", "contactPhone", "createdAt", "depositAmount", "id", "items", "notes", "orderNumber", "paidAt", "paymentMethod", "paymentNotes", "platformFee", "platformFeeBps", "preferredDate", "price", "status", "stripeCheckoutSessionId", "stripePaymentIntentId", "tipAmount", "totalDue", "updatedAt", "userId") SELECT "adminNotes", "amountPaid", "contactEmail", "contactName", "contactPhone", "createdAt", "depositAmount", "id", "items", "notes", "orderNumber", "paidAt", "paymentMethod", "paymentNotes", "platformFee", "platformFeeBps", "preferredDate", "price", "status", "stripeCheckoutSessionId", "stripePaymentIntentId", "tipAmount", "totalDue", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_requestId_key" ON "Order"("requestId");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
