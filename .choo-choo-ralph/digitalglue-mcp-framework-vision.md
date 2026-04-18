# @digitalglue/mcp — Shared MCP Framework Vision

## Date: 2026-04-05

---

## The Problem

Digital Glue operates 6+ RWSDK apps on Cloudflare: fresh-catch, sku, garden center, auction, hypno, routefast. Each app has vendors/operators who need conversational management (voice, chat, command bar) and customers who need instant answers. Building MCP infrastructure per app means:

- Rebuilding auth (session + API key + OAuth) 6 times
- Rebuilding rate limiting, audit logging, error handling 6 times
- Rebuilding the McpAgent DO pattern 6 times
- Divergent implementations that drift apart
- No shared learnings between apps

All 6 apps share the same operator (Barrett), the same Cloudflare account, the same RWSDK framework, and the same trust model. The infrastructure is identical. Only the domain tools differ.

## The Insight

Fresh-catch's MCP implementation splits cleanly into two layers:

| Generic (same across all apps) | Domain-specific (per app) |
|------|------|
| McpAgent base class (DO-backed) | Tool definitions (list_catch vs list_products) |
| Auth: session + API key + dev secret | Tool handlers (DB queries per schema) |
| Rate limiting (read/write/llm tiers) | Resources (catch://today vs inventory://current) |
| Audit log (DO SQLite, standard schema) | Prompts (seafood market tone vs garden center tone) |
| Error handling (isError, Zod validation) | Domain logic, business rules |
| Cost tracking (per-org token budget) | Cross-entity queries (cross-vendor vs cross-store) |
| Server card (/.well-known/mcp.json) | |
| AI agent base (model routing, caching) | |

The generic layer is a package. The domain layer is what each app provides.

---

## Architecture

### Layer Model

```
@digitalglue/mcp (shared npm package)
│
├── DigitalGlueMcpAgent extends McpAgent (from Cloudflare agents SDK)
│   ├── Auth
│   │   ├── Session cookie (in-app clients, RWSDK sessions)
│   │   ├── API key (external clients, per-org, hashed in DB)
│   │   ├── Dev secret (local testing)
│   │   └── OAuth 2.1 (future: third-party clients)
│   │
│   ├── Rate Limiting
│   │   ├── Per-tool tiers (read: 1000/min, write: 100/min, llm: 10/min)
│   │   ├── Sliding window in DO SQLite
│   │   └── Per-org isolation
│   │
│   ├── Audit Log
│   │   ├── DO SQLite: tool_name, input_hash, result_status, caller_role, timestamp, duration_ms
│   │   └── Queryable by tool, date range, role
│   │
│   ├── Error Handling
│   │   ├── Tool errors → isError: true (never crash connection)
│   │   ├── Zod validation on all tool inputs
│   │   └── Structured error types (validation, auth, rate_limit, internal)
│   │
│   ├── AI Agent Base
│   │   ├── Model routing (Haiku for simple, Sonnet for complex)
│   │   ├── Exact-match response cache (DO SQLite, configurable TTL)
│   │   ├── Per-org monthly token budget
│   │   ├── max_tokens enforcement
│   │   └── Gap logging (unanswerable questions → product signal)
│   │
│   └── Server Card
│       └── Auto-generated /.well-known/mcp.json from registered tools
│
├── defineTools<TContext>()
│   ├── Type-safe tool definition helper
│   ├── Zod schema integration
│   ├── Role annotations (admin, customer, platform)
│   └── Dual-export: voiceFormat() + mcpFormat()
│
├── apiKeyAuth()
│   ├── Middleware for API key validation
│   ├── Hash comparison (SHA-256)
│   └── Key generation + prefix utilities
│
└── costTracker()
    ├── Per-org token counting (input + output)
    ├── Monthly budget enforcement
    └── Usage reporting helpers
```

### Per-App Usage

```typescript
// fresh-catch/src/mcp/agent.ts
import { DigitalGlueMcpAgent, defineTools } from '@digitalglue/mcp'

const tools = defineTools<FreshCatchContext>({
  list_catch: {
    description: "Current catch listing",
    schema: z.object({ activeOnly: z.boolean().optional() }),
    roles: ["customer", "owner", "manager"],
    handler: async (input, ctx) => {
      return db.catch.findMany({ where: { orgId: ctx.org.id } })
    }
  },
  update_catch: {
    description: "Update today's catch",
    schema: z.object({ headline: z.string(), items: z.array(...) }),
    roles: ["owner", "manager"],
    handler: async (input, ctx) => { ... }
  },
  // ...app-specific tools
})

export class FreshCatchMcp extends DigitalGlueMcpAgent {
  tools = tools
  resources = { "catch://today": fetchCatch, "markets://schedule": fetchMarkets }
  prompts = { "vendor-assistant": vendorPrompt, "customer-assistant": customerPrompt }
}
```

```typescript
// sku/src/mcp/agent.ts
import { DigitalGlueMcpAgent, defineTools } from '@digitalglue/mcp'

const tools = defineTools<SkuContext>({
  list_products: { ... },
  get_inventory: { ... },
  create_order: { ... },
})

export class SkuMcp extends DigitalGlueMcpAgent {
  tools = tools
  resources = { "inventory://current": fetchInventory }
  prompts = { "store-assistant": storePrompt }
}
```

### Wiring (same in every app)

```typescript
// Any app's worker.tsx
import { FreshCatchMcp } from './mcp/agent'

// In route definitions:
// /mcp/:orgSlug → FreshCatchMcp.serve("/mcp/:orgSlug")
```

---

## Trust Model

```
Barrett (operator)
├── Owns all 6 Cloudflare Workers
├── Owns all D1 databases
├── Same Cloudflare account
└── Implicit trust between all apps

Per-App Trust Boundary:
├── Vendor A can't see Vendor B's data (org isolation)
├── Customer can't access admin tools (role filtering)
├── External client must have valid API key (per-org)
└── AI agent has scoped capabilities (read vs write)
```

The trust boundary is NOT between Digital Glue apps — it's between the apps and the vendors/customers inside them. Barrett trusts all his own code. The shared package doesn't introduce new trust boundaries; it codifies the existing ones.

### Inter-App Communication (when needed)

Not needed for Phase 1 — each app's MCP is self-contained. When cross-app queries arise (e.g. "show all my orders across fresh-catch and sku"):

- **Service Bindings**: same Cloudflare account, zero-latency RPC between Workers
- **No auth needed**: operator trusts operator, service bindings are private
- **This is the operator MCP** layer from earlier planning — separate from per-vendor MCP

---

## Extraction Strategy

### Phase 1: Build in fresh-catch (now)

Build the full MCP implementation inside fresh-catch. Don't extract yet. Goals:
- Prove the patterns work in production
- Discover what's truly generic vs what's fresh-catch-specific
- Ship value to Evan (the real user) first

The 46 beads already poured cover this. The McpDurableObject, auth, rate limiting, audit logging, AI agent — all built here first.

### Phase 2: Extract @digitalglue/mcp (after fresh-catch Phase 1 ships)

Once the scaffold is working:
1. Identify the generic seams (they'll be obvious by then)
2. Extract into a package — either:
   - **pnpm workspace package** (if apps are in a monorepo or can reference local paths)
   - **Private npm package** (if apps are in separate repos)
   - **Git submodule or subtree** (lightweight sharing without npm)
3. Refactor fresh-catch to consume the package
4. Wire up sku as the second consumer (proves the abstraction works)

**The extraction test**: Can sku get a working MCP endpoint by installing the package and defining ~10 tools? If yes, the abstraction is right. If sku needs to fork/modify framework internals, the seam is wrong.

### Phase 3: Second app (sku or garden center)

Pick the app with the simplest domain. Install @digitalglue/mcp, define tools, ship. This validates:
- Package API is clean
- No fresh-catch assumptions leaked in
- Auth, rate limiting, audit all work out of the box
- The 80/20 holds (80% shared, 20% domain)

### Phase 4+: Remaining apps

Roll out to remaining apps. Each one should be progressively faster:
- fresh-catch: weeks (building everything)
- sku: days (package + domain tools)
- garden center: hours (it's a pattern now)

---

## Ejection Path

Three levels of independence, chosen per-app:

### Embedded (default)

App uses `@digitalglue/mcp`. Shared infrastructure, shared updates. Bug fixed once, all apps benefit. This is where every app starts and where most stay.

### Forked

An app needs something the framework doesn't support — custom auth flow, non-standard rate limiting, unique transport. Fork the package into that app's codebase. You maintain it independently. The framework evolves without you, you evolve without it.

**When to fork**: When the cost of working around the framework exceeds the cost of maintaining your own copy. This should be rare if the framework's abstractions are right.

### Product

`@digitalglue/mcp` becomes a product. Other RWSDK developers install it and get MCP for their apps. Battle-tested across 6 Digital Glue apps. This is the long game — the framework becomes the value, not the apps.

**What makes this viable**: RWSDK is growing. Every RWSDK app on Cloudflare has the same problem (voice, chat, AI, per-org isolation). The framework solves it once.

---

## What the Package Does NOT Include

Each app provides its own:
- Tool definitions and handlers (the domain logic)
- Resources and prompts (domain-specific content)
- Database schema and queries (Prisma models per app)
- UI components (CommandBar, ChatSheet — app-level)
- Vendor/customer facing pages

The package is infrastructure, not product. It doesn't know what a "catch" is or what a "market" is. It knows how to serve MCP tools securely, rate-limit them, audit them, and route AI responses.

---

## What the Package Gives You for Free

When you `extends DigitalGlueMcpAgent` and define your tools, you get:
- `/mcp/:orgSlug` endpoint with Streamable HTTP transport
- Session + API key + dev secret auth (zero config)
- Per-tool rate limiting with three tiers
- Full audit trail in DO SQLite
- AI agent with model routing, caching, token budgets
- Gap logging for unanswerable questions
- `/.well-known/mcp.json` auto-generated from your tools
- Error handling that never crashes the MCP connection
- Input validation on every tool call

---

## Open Questions

1. **Package hosting**: pnpm workspace vs private npm vs git subtree? Depends on whether the 6 apps become a monorepo. Current state: separate repos.

2. **Context type generics**: `DigitalGlueMcpAgent<TContext>` — how much of the context shape is shared (org, user, role) vs app-specific (catch, markets, products)? Need to find the right generic boundary.

3. **AI agent in the package or separate?** The AI agent (Claude API wrapper, model routing, caching) is substantial. It could be a separate package (`@digitalglue/mcp-ai`) or stay in the main package. Depends on whether apps want MCP without AI.

4. **Version sync**: When the package updates, all apps need to test. How do we manage breaking changes across 6 consumers? Semver + changelogs? Operator MCP that tracks versions?

5. **Cloudflare Agents SDK stability**: The `agents` package is at v0.9.0. Pre-1.0 means breaking changes are expected. The shared package absorbs this risk — apps depend on `@digitalglue/mcp`, not on `agents` directly. Good.

6. **Workers for Platforms**: Research shows DO bindings aren't confirmed for dispatch namespace user workers. If Digital Glue ever wants to let third parties deploy their own MCP apps on your infrastructure, this is a gap. Not blocking now — the package approach sidesteps it entirely.

7. **Cross-app tool discovery**: When the operator MCP layer arrives, will apps register their tools with a central registry? Or does the operator just know where each app's MCP endpoint is? Registration = more infrastructure. Static config = simpler.

8. **When does ejection actually happen?** In practice, probably never for most apps. The value of staying on the shared package (bug fixes, improvements, consistency) almost always outweighs the cost of framework constraints. Ejection is a safety valve, not a planned outcome.
