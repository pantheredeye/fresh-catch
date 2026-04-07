# External MCP Client Integration Test Procedure

End-to-end verification of the MCP external client flow using curl and MCP Inspector.

**Transport:** Streamable HTTP (`/mcp/:orgSlug`)
**Auth:** Bearer token (`Authorization: Bearer fc_key_...`)

## Prerequisites

1. Dev server running: `pnpm run dev`
2. A test org with slug (e.g., `test-vendor`)
3. An API key generated via Admin > Settings > API (`/admin/settings/api`)
4. Save the raw key — it's only shown once

```bash
# Set these for all tests below
export BASE_URL="http://localhost:5173"
export ORG_SLUG="test-vendor"
export API_KEY="fc_key_..."
export MCP_URL="$BASE_URL/mcp/$ORG_SLUG"
```

---

## Test 1: MCP Initialize (Streamable HTTP)

The MCP streamable-http transport uses POST with JSON-RPC 2.0 messages.

```bash
# Initialize handshake
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

**Expected:** JSON-RPC response with `serverInfo: { name: "fresh-catch", version: "1.0.0" }` and capabilities listing tools/resources/prompts.

**Note:** Save the `Mcp-Session-Id` response header — include it in subsequent requests.

```bash
export MCP_SESSION="<value from Mcp-Session-Id header>"
```

## Test 2: tools/list Returns All Tools

```bash
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $MCP_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**Expected:** 11 tools returned:
- **Read:** `list_catch`, `get_markets`, `get_vendor_popups`, `get_market_vendors`
- **Write:** `create_order`, `update_catch`, `create_market`, `create_popup`, `update_market`, `update_market_catch`, `send_message`

## Test 3: list_catch — Read Tool

```bash
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $MCP_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_catch",
      "arguments": {}
    }
  }'
```

**Expected:** JSON with catch items (or "No catch data" message if empty). `isError` should be absent/false.

## Test 4: get_markets — Read Tool

```bash
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $MCP_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_markets",
      "arguments": {}
    }
  }'
```

**Expected:** JSON array of markets for the org.

## Test 5: update_catch — Write Tool (Valid Data)

```bash
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $MCP_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "update_catch",
      "arguments": {
        "items": [
          { "name": "Wild Salmon", "note": "Fresh from the boat, $18/lb" },
          { "name": "Dungeness Crab", "note": "Live, $12 each" }
        ],
        "headline": "MCP Integration Test Catch"
      }
    }
  }'
```

**Expected:** Success response confirming catch updated. No `isError`.

**Verify persistence:** Call `list_catch` again (Test 3) and confirm the new items appear.

## Test 6: update_catch — Write Tool (Invalid Data)

```bash
curl -X POST "$MCP_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $MCP_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "update_catch",
      "arguments": {
        "items": "not-an-array"
      }
    }
  }'
```

**Expected:** `isError: true` with validation error message.

## Test 7: Wrong API Key — 401

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$MCP_URL" \
  -H "Authorization: Bearer fc_key_INVALID_KEY_12345678" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

**Expected:** HTTP 401 Unauthorized.

## Test 8: Key for Org A on Org B Endpoint — 401

```bash
# Use org A's key against org B's slug
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/mcp/other-org-slug" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

**Expected:** HTTP 401 (key hash won't match other org's stored hash) or 404 if org doesn't exist.

## Test 9: Rate Limit Burst

```bash
# Blast 105 write-tier calls in quick succession (limit: 100/min)
for i in $(seq 1 105); do
  curl -s -X POST "$MCP_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $MCP_SESSION" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $((100 + i)),
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"update_catch\",
        \"arguments\": {
          \"items\": [{\"name\": \"Test Fish $i\", \"note\": \"rate limit test\"}],
          \"headline\": \"Rate limit test $i\"
        }
      }
    }" &
done
wait

# The last few should return isError with "Rate limit exceeded"
```

**Expected:** First ~100 calls succeed, remaining return `isError: true` with rate limit message containing "Rate limit exceeded for write tier".

## Test 10: Audit Trail Verification

There's no direct external API to query the audit trail — it lives in the McpDO SQLite storage. Verify via:

**Option A: Admin UI**
- Navigate to the admin dashboard and check if MCP tool call logs appear

**Option B: MCP Inspector**
- Connect MCP Inspector to the endpoint and observe logged calls in the DO

**Option C: Wrangler DO inspection (local dev)**
```bash
# If using local dev with wrangler, inspect DO storage directly
# The tool_calls table should contain entries for all tests above
# Each entry has: tool_name, result_status, caller_role ("owner"), timestamp, duration_ms
```

**Expected:** Audit entries for every tool call made in tests 3-6 and 9, with correct `tool_name`, `result_status` (success/error), and `caller_role` ("owner" for API key auth).

---

## Using MCP Inspector (Alternative)

For a more interactive test experience, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

1. Set transport to **Streamable HTTP**
2. Enter URL: `http://localhost:5173/mcp/<org-slug>`
3. Add header: `Authorization: Bearer fc_key_...`
4. Click Connect — should initialize successfully
5. Browse Tools tab — all 11 tools listed
6. Call tools interactively and inspect responses
7. Check Resources tab — `catch://today` and `markets://schedule`

---

## Summary Checklist

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 1 | Initialize with API key | JSON-RPC success + server info | |
| 2 | tools/list | 11 tools (4 read + 7 write) | |
| 3 | list_catch | Catch data or empty message | |
| 4 | get_markets | Market array | |
| 5 | update_catch (valid) | Success, data persisted | |
| 6 | update_catch (invalid) | isError: true | |
| 7 | Wrong API key | HTTP 401 | |
| 8 | Cross-org key | HTTP 401 or 404 | |
| 9 | Rate limit burst | Exceeded after ~100 writes | |
| 10 | Audit trail | Entries for all tool calls | |
