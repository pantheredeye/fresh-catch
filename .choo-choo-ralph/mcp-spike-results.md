# MCP SDK Decision Doc

## Decision: Cloudflare Agents SDK (`agents/mcp`) + `@modelcontextprotocol/sdk`

### SDK Chosen

**`agents` (v0.9.0)** with `@modelcontextprotocol/sdk` (v1.29.0).

The `agents` package provides `createMcpHandler()` which wraps the official MCP SDK's `McpServer` for Cloudflare Workers. This is the only actively maintained path — `workers-mcp` is deprecated.

### Why This Combo

| Factor | Detail |
|--------|--------|
| **Edge runtime** | `createMcpHandler` is purpose-built for Workers. No Node.js polyfills needed. |
| **Official SDK** | `@modelcontextprotocol/sdk` is the canonical MCP implementation. Tool/resource registration, Zod schema validation, SSE transport all work out of the box. |
| **Durable Objects** | `agents` also provides `McpAgent` (DO-based). We use `createMcpHandler` for now (stateless), but can upgrade to `McpAgent` later for per-vendor isolation via DOs. |
| **Maintenance** | Cloudflare actively maintains `agents`; MCP SDK is maintained by Anthropic. Both have frequent releases. |

### Edge Runtime Compatibility

Verified working on Cloudflare Workers (Miniflare) with no issues:
- `McpServer` instantiation, tool registration with Zod schemas, SSE transport all work
- One workaround: `createMcpHandler` expects a full `ExecutionContext` — in middleware-style routing we constructed a minimal shim (`{ waitUntil: () => {}, passThroughOnException: () => {} }`)
- This workaround goes away when we move to `McpAgent` (Durable Object class) or pass the real `ExecutionContext` from the Worker entry point

### Bundle Size Impact

- `@modelcontextprotocol/sdk`: ~45KB gzipped (tree-shakes well — we only import `McpServer` from `server/mcp.js`)
- `agents`: ~12KB gzipped (only pulling `createMcpHandler` from `agents/mcp`)
- `zod`: already a dependency (used for form validation elsewhere)
- **Net addition**: ~57KB gzipped. Acceptable for a Workers bundle.

### Approach: `createMcpHandler` vs `McpAgent`

| | `createMcpHandler` | `McpAgent` (DO) |
|---|---|---|
| **Use case** | Stateless request/response | Per-client persistent state |
| **Session** | None built-in | DO provides isolation + SQLite |
| **Complexity** | Low — one function call | Medium — DO class lifecycle |
| **Our plan** | Phase 1 (read-only tools) | Phase 2+ (audit log, rate limits, per-vendor) |

Starting with `createMcpHandler` for the read-only MCP scaffold. Migrate to `McpAgent` when we add `McpDurableObject` with SQLite (audit log, rate limits).

### Workarounds

1. **ExecutionContext shim** — `createMcpHandler(server, { route })` returns a `(req, env, ctx) => Response` handler. In our `defineApp` middleware we don't have a native `ExecutionContext`. Current shim works; will be unnecessary once we use `McpAgent` DO or thread the real ctx.

2. **Route placement** — MCP endpoint must sit before session/auth middleware in `worker.tsx` because it handles its own auth (API key / dev secret). This is the correct pattern for protocol-level endpoints.

### Gotchas

- **Import paths matter**: Use `@modelcontextprotocol/sdk/server/mcp.js` (not bare `@modelcontextprotocol/sdk`). The SDK uses subpath exports.
- **Zod is required**: Tool schemas must be Zod objects. No plain JSON Schema option in the high-level API.
- **SSE transport only**: `createMcpHandler` uses SSE. Stdio transport isn't available in Workers (expected). Claude Desktop connects fine over SSE.
- **`agents` versioning**: v0.9.0 is pre-1.0. Pin exact version in production. API surface may shift.
