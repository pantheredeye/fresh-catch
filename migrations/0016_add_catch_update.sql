-- CatchUpdate: voice-recorded catch updates for organizations
CREATE TABLE "CatchUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "recordedBy" TEXT,
    "rawTranscript" TEXT NOT NULL,
    "formattedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'live',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatchUpdate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CatchUpdate_organizationId_idx" ON "CatchUpdate"("organizationId");
CREATE INDEX "CatchUpdate_organizationId_status_idx" ON "CatchUpdate"("organizationId", "status");
