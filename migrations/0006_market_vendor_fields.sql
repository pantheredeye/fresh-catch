-- AlterTable
ALTER TABLE "Market" ADD COLUMN "address" TEXT;
ALTER TABLE "Market" ADD COLUMN "closeMinutes" INTEGER;
ALTER TABLE "Market" ADD COLUMN "dayOfWeek" INTEGER;
ALTER TABLE "Market" ADD COLUMN "landmark" TEXT;
ALTER TABLE "Market" ADD COLUMN "openMinutes" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
    "notificationEmail" TEXT,
    "phone" TEXT,
    "displayName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago'
);
INSERT INTO "new_Vendor" ("id", "name", "notificationEmail", "platformFeeBps", "stripeAccountId", "stripeOnboardingComplete") SELECT "id", "name", "notificationEmail", "platformFeeBps", "stripeAccountId", "stripeOnboardingComplete" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
