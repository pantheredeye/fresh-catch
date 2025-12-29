-- Migration: Add Order model and user contact fields (name, phone)

-- Add contact fields to User table
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- Create Order table
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    -- Contact snapshot (captured at order time)
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,

    -- Order details
    "items" TEXT NOT NULL,
    "preferredDate" DATETIME,
    "notes" TEXT,

    -- Admin fields
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price" TEXT,
    "adminNotes" TEXT,

    -- Timestamps
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    -- Foreign keys
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes for query performance
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);
