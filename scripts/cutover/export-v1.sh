#!/usr/bin/env bash
# Read-only export of the v1 prod rows that migrate to v2 — Market,
# CatchUpdate, User. SELECT only, no writes, no other tables touched.
#
# Everything else in v1's D1 is deliberately left alone (do-not-migrate list:
# docs/audit/data-stripe.md §1a, REBUILD-PLAN.md §4, and the plan comment on
# issue #61 dropping Orders/Conversations as fake test data).
#
# Run manually by Barrett as part of G4 (docs/CUTOVER.md) — never from an
# agent session. Output feeds the hand-authored INSERTs in import-v2.sql;
# this script only reads and writes local JSON files, nothing else.
set -euo pipefail

V1_DATABASE="fresh-catch-evan-prod" # 71d2e8c4-b9a8-48ea-9fc5-550a9206ea61 (runbook had wrong name "digitalglue-market")
WRANGLER="${WRANGLER:-pnpm exec wrangler}" # override with WRANGLER=wrangler if global install
OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/export"
mkdir -p "$OUT_DIR"

echo "Exporting Market..."
$WRANGLER d1 execute "$V1_DATABASE" --remote --json \
  --command "SELECT id, organizationId, name, schedule, subtitle, locationDetails, customerInfo, active, createdAt, updatedAt, type, expiresAt, catchPreview, notes, rawTranscript, cancelledAt, county, city FROM Market ORDER BY createdAt;" \
  > "$OUT_DIR/market.json"

echo "Exporting CatchUpdate..."
$WRANGLER d1 execute "$V1_DATABASE" --remote --json \
  --command "SELECT id, organizationId, recordedBy, rawTranscript, formattedContent, status, createdAt, updatedAt FROM CatchUpdate ORDER BY createdAt;" \
  > "$OUT_DIR/catchupdate.json"

echo "Exporting User..."
$WRANGLER d1 execute "$V1_DATABASE" --remote --json \
  --command "SELECT id, username, email, name, phone, deletedAt, createdAt FROM User ORDER BY createdAt;" \
  > "$OUT_DIR/user.json"

cat <<EOF

Exported to:
  $OUT_DIR/market.json
  $OUT_DIR/catchupdate.json
  $OUT_DIR/user.json

Next: review each file, then hand-author scripts/cutover/import-v2.sql from
the real rows — skip the "Test popup" Market row (a manual test, see
data-stripe.md §3). Do not run import-v2.sql until you've checked it against
these exports.
EOF
