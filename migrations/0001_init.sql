-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
    "notificationEmail" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "subtitle" TEXT,
    "locationDetails" TEXT,
    "customerInfo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'regular',
    "expiresAt" DATETIME,
    "catchPreview" TEXT,
    "notes" TEXT,
    "rawTranscript" TEXT,
    "cancelledAt" DATETIME,
    "county" TEXT,
    "city" TEXT
);

-- CreateTable
CREATE TABLE "CatchUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordedBy" TEXT,
    "rawTranscript" TEXT NOT NULL,
    "formattedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'live',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FishRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "species" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "evanResponse" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FishRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FishRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" INTEGER NOT NULL,
    "userId" TEXT,
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
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "LoginCode" (
    "emailHash" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Market_active_idx" ON "Market"("active");

-- CreateIndex
CREATE INDEX "Market_type_active_idx" ON "Market"("type", "active");

-- CreateIndex
CREATE INDEX "CatchUpdate_status_idx" ON "CatchUpdate"("status");

-- CreateIndex
CREATE INDEX "FishRequest_status_idx" ON "FishRequest"("status");

-- CreateIndex
CREATE INDEX "FishRequest_createdAt_idx" ON "FishRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RequestMessage_requestId_idx" ON "RequestMessage"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
