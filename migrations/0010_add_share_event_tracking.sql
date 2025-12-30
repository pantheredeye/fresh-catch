-- Migration: Add ShareEvent table for tracking share analytics
-- Date: 2025-12-30

CREATE TABLE ShareEvent (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  shareType TEXT NOT NULL,
  sharedBy TEXT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES Organization(id),
  FOREIGN KEY (sharedBy) REFERENCES User(id)
);

CREATE INDEX idx_share_event_org ON ShareEvent(organizationId);
CREATE INDEX idx_share_event_timestamp ON ShareEvent(timestamp);
