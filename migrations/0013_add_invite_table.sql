-- CreateTable
CREATE TABLE Invite (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES Organization(id),
  email TEXT,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invitedBy TEXT NOT NULL REFERENCES User(id),
  status TEXT NOT NULL DEFAULT 'pending',
  acceptedBy TEXT REFERENCES User(id),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME
);

-- CreateIndex
CREATE INDEX idx_invite_token ON Invite(token);
CREATE INDEX idx_invite_org ON Invite(organizationId);
