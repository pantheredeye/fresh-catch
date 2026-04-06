-- Migration: Remove password fields from User + delete all user-linked records
-- Preserves: Organization, Market, CatchUpdate
-- Also fixes Order table missing PRIMARY KEY from migration 0012

PRAGMA foreign_keys=OFF;

-- Delete user-linked records (leaf tables first, then parents)
DELETE FROM "Message";
DELETE FROM "Conversation";
DELETE FROM "Credential";
DELETE FROM "ShareEvent";
DELETE FROM "Invite";
DELETE FROM "Membership";

-- Drop and recreate Payment + Order (fixes missing PK on Order from migration 0012)
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "Order";

CREATE TABLE "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderNumber" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "Order_organizationId_orderNumber_key" ON "Order"("organizationId", "orderNumber");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

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

-- Delete all users
DELETE FROM "User";

-- Recreate User table without password fields
CREATE TABLE "new_User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "phone" TEXT,
  "deliveryStreet" TEXT,
  "deliveryCity" TEXT,
  "deliveryState" TEXT,
  "deliveryZip" TEXT,
  "deliveryNotes" TEXT,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

PRAGMA foreign_keys=ON;
