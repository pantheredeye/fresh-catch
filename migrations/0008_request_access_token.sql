-- Secret-link thread access (#131): every request gets an unguessable
-- accessToken so an emailed link opens the thread from any device. SQLite
-- can't ADD a NOT NULL column without a constant default (which would
-- collide on the unique index), so redefine the table and backfill existing
-- rows inline: randomblob(32) = 256 bits, hex-encoded. New rows get a
-- base64url token from crypto.getRandomValues in createRequest — the two
-- encodings never need to match, the column is only compared as a string.

-- D1 keeps foreign keys on inside migrations (foreign_keys=OFF is a no-op), so
-- DROP TABLE "FishRequest" fires child FK actions: RequestItem (ON DELETE
-- CASCADE) rows get deleted and Order.requestId (SET NULL) gets nulled. Snapshot
-- both first and restore after the rename.
CREATE TABLE "_bak_RequestItem" AS SELECT * FROM "RequestItem";
CREATE TABLE "_bak_OrderRequest" AS SELECT "id", "requestId" FROM "Order" WHERE "requestId" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FishRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "deviceToken" TEXT,
    "accessToken" TEXT NOT NULL,
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
INSERT INTO "new_FishRequest" ("accessToken", "contactEmail", "contactName", "contactPhone", "createdAt", "deviceToken", "id", "itemCount", "lastMessageAt", "notes", "origin", "quantity", "quotedPriceCents", "requestType", "species", "status", "userId") SELECT lower(hex(randomblob(32))), "contactEmail", "contactName", "contactPhone", "createdAt", "deviceToken", "id", "itemCount", "lastMessageAt", "notes", "origin", "quantity", "quotedPriceCents", "requestType", "species", "status", "userId" FROM "FishRequest";
DROP TABLE "FishRequest";
ALTER TABLE "new_FishRequest" RENAME TO "FishRequest";
CREATE UNIQUE INDEX "FishRequest_accessToken_key" ON "FishRequest"("accessToken");
CREATE INDEX "FishRequest_status_idx" ON "FishRequest"("status");
CREATE INDEX "FishRequest_createdAt_idx" ON "FishRequest"("createdAt");
CREATE INDEX "FishRequest_deviceToken_idx" ON "FishRequest"("deviceToken");
CREATE INDEX "FishRequest_status_lastMessageAt_idx" ON "FishRequest"("status", "lastMessageAt");
INSERT INTO "RequestItem" SELECT * FROM "_bak_RequestItem" WHERE "id" NOT IN (SELECT "id" FROM "RequestItem");
UPDATE "Order" SET "requestId" = (SELECT b."requestId" FROM "_bak_OrderRequest" b WHERE b."id" = "Order"."id")
  WHERE "id" IN (SELECT "id" FROM "_bak_OrderRequest");
DROP TABLE "_bak_RequestItem";
DROP TABLE "_bak_OrderRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
