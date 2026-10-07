-- CreateTable
CREATE TABLE "RequestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "quantity" TEXT,
    "notes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "priceCents" INTEGER,
    "marketRate" BOOLEAN NOT NULL DEFAULT false,
    "vendorNote" TEXT,
    CONSTRAINT "RequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FishRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FishRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "deviceToken" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'fish',
    "species" TEXT,
    "quantity" TEXT,
    "notes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'customer',
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessageAt" DATETIME,
    "quotedPriceCents" INTEGER,
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FishRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FishRequest" ("contactEmail", "contactName", "contactPhone", "createdAt", "deviceToken", "id", "lastMessageAt", "notes", "origin", "quantity", "quotedPriceCents", "requestType", "species", "status", "userId") SELECT "contactEmail", "contactName", "contactPhone", "createdAt", "deviceToken", "id", "lastMessageAt", "notes", "origin", "quantity", "quotedPriceCents", "requestType", "species", "status", "userId" FROM "FishRequest";
DROP TABLE "FishRequest";
ALTER TABLE "new_FishRequest" RENAME TO "FishRequest";
CREATE INDEX "FishRequest_status_idx" ON "FishRequest"("status");
CREATE INDEX "FishRequest_createdAt_idx" ON "FishRequest"("createdAt");
CREATE INDEX "FishRequest_deviceToken_idx" ON "FishRequest"("deviceToken");
CREATE INDEX "FishRequest_status_lastMessageAt_idx" ON "FishRequest"("status", "lastMessageAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RequestItem_requestId_idx" ON "RequestItem"("requestId");

-- Backfill: one position-0 RequestItem per existing fish request — the
-- headline denorm (FishRequest.species/quantity) stays in place. SQLite has
-- no uuid(); 32 lowercase hex chars is unique enough for an id. The NOT
-- EXISTS guard makes the statement idempotent (and safe to mirror in tests).
INSERT INTO "RequestItem" ("id", "requestId", "position", "species", "quantity")
SELECT lower(hex(randomblob(16))), "id", 0, "species", "quantity"
FROM "FishRequest"
WHERE "requestType" = 'fish' AND "species" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "RequestItem" ri WHERE ri."requestId" = "FishRequest"."id");

-- itemCount default 1 matches the backfilled fish rows; zero out requests
-- that got no item row (questions, fish rows with no species).
UPDATE "FishRequest" SET "itemCount" = 0
WHERE "requestType" != 'fish' OR "species" IS NULL;
