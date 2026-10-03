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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FishRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FishRequest" ("contactEmail", "contactName", "contactPhone", "createdAt", "id", "notes", "species", "status", "userId") SELECT "contactEmail", "contactName", "contactPhone", "createdAt", "id", "notes", "species", "status", "userId" FROM "FishRequest";
DROP TABLE "FishRequest";
ALTER TABLE "new_FishRequest" RENAME TO "FishRequest";
CREATE INDEX "FishRequest_status_idx" ON "FishRequest"("status");
CREATE INDEX "FishRequest_createdAt_idx" ON "FishRequest"("createdAt");
CREATE INDEX "FishRequest_deviceToken_idx" ON "FishRequest"("deviceToken");
CREATE INDEX "FishRequest_status_lastMessageAt_idx" ON "FishRequest"("status", "lastMessageAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
