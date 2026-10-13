-- Secret-link thread access (#131): every request gets an unguessable
-- accessToken so an emailed link opens the thread from any device. SQLite
-- can't ADD a NOT NULL column without a constant default (which would
-- collide on the unique index), so redefine the table and backfill existing
-- rows inline: randomblob(32) = 256 bits, hex-encoded. New rows get a
-- base64url token from crypto.getRandomValues in createRequest — the two
-- encodings never need to match, the column is only compared as a string.

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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
