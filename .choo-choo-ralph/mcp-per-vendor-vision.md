# MCP Per Vendor — Vision Document

## Date: 2026-04-04

---

## The Problem

Fresh Catch vendors are often physically at markets — hands full of fish, talking to customers, managing ice and inventory. They need to manage their digital presence (catch updates, order tracking, market schedules) without stopping to navigate an admin UI.

Customers want instant answers — "what's fresh today?", "when's the next popup?", "can I order mahi for Saturday?" — but the vendor might be busy filleting. The chat goes unanswered.

## The Insight

Fresh Catch already has a voice tool registry (`src/api/voice-tools.ts`) with structured intents and schemas, server functions that handle CRUD operations scoped to organizations, and a command bar that resolves natural language to tool calls. This is 80% of an MCP server — it just lacks the protocol wrapper.

---

## Scenario 1: Vendor Managing via Voice/Claude Desktop

**Evan runs Fresh Catch Seafood. It's 6am, he's at the dock.**

His phone buzzes — Claude Desktop is connected to his Fresh Catch MCP server.

> **Evan** (voice): "Got a good haul today. 40 pounds grouper, 25 pounds mahi, some flounder. Grouper at 16, mahi at 14, flounder at 11."
>
> **Claude**: "Updated today's catch:
> - Grouper — 40 lbs @ $16/lb
> - Mahi Mahi — 25 lbs @ $14/lb  
> - Flounder — 25 lbs @ $11/lb
>
> Want me to post this to your Adobe Ranch market too?"
>
> **Evan**: "Yeah, and check if I have any orders for today."
>
> **Claude**: "Posted to Adobe Ranch. You have 3 orders for today:
> - Sarah M. — 2 lbs mahi, pickup at Adobe Ranch
> - James K. — 5 lbs grouper, pickup at Adobe Ranch
> - Lisa W. — 1 lb flounder, 2 lbs mahi, pickup at Folly Beach
>
> Folly Beach popup isn't until Thursday though. Want me to message Lisa about that?"

**MCP tools called**: `update_catch`, `update_market_catch`, `get_orders`, `send_message`

Evan never opened the admin UI. He managed his business conversationally while driving to the market.

---

## Scenario 2: Customer Chat with AI Agent

**Maria wants to order seafood for a dinner party Saturday.**

She opens market.digitalglue.dev, sees Evan's page, taps Chat.

> **Maria**: "Hey, what do you have fresh this week?"
>
> **[AI]**: "Hi! Here's what Evan has today:
> - Grouper — $16/lb (40 lbs available)
> - Mahi Mahi — $14/lb (25 lbs available)
> - Flounder — $11/lb
>
> Anything catch your eye?"
>
> **Maria**: "I need enough mahi for 8 people. How much should I get?"
>
> **[AI]**: "For 8 people, I'd recommend about 4 lbs of mahi (roughly 8oz per person). That'd be $56. Want me to set that aside for you?"
>
> **Maria**: "Yes please, for Saturday pickup at Adobe Ranch."
>
> **[AI]**: "Done! Order placed:
> - 4 lbs Mahi Mahi — $56
> - Pickup: Saturday at Adobe Ranch Market
>
> Evan will confirm shortly. Anything else?"

**MCP tools called**: `list_catch`, `create_order`

**What Evan sees**: The chat shows Maria's messages and AI responses tagged `[AI]`. He gets a notification about the new order. He can jump in anytime — the AI is his assistant, not his replacement.

---

## Scenario 3: Customer Command Bar (Voice)

**Jake is a regular. He knows what he wants.**

He taps the mic on the customer bottom nav and says:

> "Order 3 pounds grouper for Saturday at Folly Beach"

The command bar resolves this via MCP:
- `list_catch` → confirms grouper is available
- `create_order` → 3 lbs grouper, Saturday, Folly Beach pickup
- Shows confirmation card: "3 lbs Grouper — $48. Pickup Saturday at Folly Beach. Confirm?"

Jake taps confirm. Done in 10 seconds.

**MCP tools called**: `list_catch`, `create_order`

---

## Scenario 4: Simple Cross-Vendor Queries

**Not a marketplace search engine — just practical local questions.**

Customer is browsing a market page or vendor page and asks:

> "Who else is at the Adobe Ranch market?"
> → `get_market_vendors` — returns list of vendors at that market

> "Where is Fresh Catch located at the Saturday market?"
> → `get_vendor_market_location` — returns booth/location info if set

> "Are there any other seafood vendors in Charleston County?"
> → `get_county_vendors` — returns vendors in the same county

> "When is Evan's next popup?"
> → `get_vendor_popups` — returns upcoming popup schedule

These are read-only queries against the existing org/market data. No privacy concerns — this is public market information.

---

## Architecture

```
Fresh Catch Platform (one repo, one codebase)
│
├── MCP Server Layer (new, thin wrapper)
│   │
│   ├── Per-Vendor MCP (/mcp/:orgSlug)
│   │   ├── Auth: API key (external clients) or session (in-app)
│   │   ├── Transport: Streamable HTTP (Cloudflare Workers native)
│   │   │
│   │   ├── Tools (sourced from voice-tools.ts + new additions)
│   │   │   │
│   │   │   ├── [admin role]
│   │   │   │   ├── update_catch (existing)
│   │   │   │   ├── create_market (existing)
│   │   │   │   ├── create_popup (existing)
│   │   │   │   ├── update_market (existing)
│   │   │   │   ├── cancel_popup (existing)
│   │   │   │   ├── update_market_catch (existing)
│   │   │   │   ├── get_orders (new)
│   │   │   │   └── send_message (existing in chat)
│   │   │   │
│   │   │   └── [customer role]
│   │   │       ├── list_catch (new, read-only)
│   │   │       ├── get_markets (new, read-only)
│   │   │       ├── create_order (new)
│   │   │       ├── get_order_status (new)
│   │   │       ├── get_market_vendors (new, cross-vendor read)
│   │   │       ├── get_vendor_market_location (new)
│   │   │       ├── get_county_vendors (new)
│   │   │       └── get_vendor_popups (new)
│   │   │
│   │   ├── Resources
│   │   │   ├── catch://today (current catch listing)
│   │   │   ├── markets://schedule (market schedule)
│   │   │   └── orders://mine (customer's orders)
│   │   │
│   │   └── Prompts
│   │       ├── vendor-assistant (full context, admin persona)
│   │       └── customer-assistant (friendly, read + order, no admin)
│   │
│   └── Source of Truth
│       └── src/api/voice-tools.ts (defines ALL tool schemas)
│           → exports voiceFormat() for CommandBar
│           → exports mcpFormat() for MCP server
│
├── MCP Clients (existing UI, new wiring)
│   ├── CommandBar (admin voice → MCP tools)
│   ├── Customer ChatSheet (msg → AI agent → MCP tools → response)
│   ├── Customer CommandBar (voice → MCP tools, future)
│   └── Claude Desktop (external, vendor connects via API key)
│
├── AI Agent Layer (new)
│   ├── Claude API for customer chat responses
│   ├── Tool injection from MCP tool definitions
│   ├── Conversation context from chat history
│   └── Vendor persona/tone from org settings
│
└── Existing Server Functions (unchanged, become MCP handlers)
    ├── market-functions.ts
    ├── catch-functions.ts
    └── chat/functions.ts
```

---

## Implementation Phases

### Phase 1: MCP Server Scaffold + Read-Only Tools
- Create MCP server endpoint at `/mcp/:orgSlug`
- Streamable HTTP transport (native to Cloudflare Workers)
- Export voice-tools.ts registry as MCP tool definitions
- Implement read-only tools: `list_catch`, `get_markets`, `get_vendor_popups`
- Auth: session-based for in-app, API key for external (stored in org settings)
- Test: connect Claude Desktop to a vendor instance

### Phase 2: Customer Chat Agent
- Add Claude API integration for chat responses
- Inject MCP read tools as function definitions
- AI responds to customer questions using tool calls
- Messages tagged `[AI]` in chat UI
- Vendor notification on AI-handled conversations
- Vendor can take over at any point (AI goes quiet)
- Test: customer asks "what's fresh?" → gets structured answer

### Phase 3: Write Tools + Full Voice MCP
- Add write tools: `create_order`, `update_catch`, `send_message`
- Command bar becomes MCP client (voice → MCP instead of voice → hardcoded router)
- Customer can place orders through chat agent
- Claude Desktop can do full vendor management
- Test: Evan updates catch from Claude Desktop

### Phase 4: Customer Command Bar
- Bottom nav mic for customers (from existing command bar direction memory)
- Customer-scoped MCP tools (list, order, search)
- Voice ordering: "Order 3 pounds grouper for Saturday"
- Simple cross-vendor queries: "Who else is at Adobe Ranch?"
- Test: voice order flow end-to-end

---

## Cross-Vendor Queries (Scoped, Practical)

Not a search engine. Just answering natural questions a customer at a market would ask:

| Query | Tool | Data Source |
|-------|------|-------------|
| "Who else is at this market?" | `get_market_vendors` | Market → org relationships |
| "Where is [vendor] at [market]?" | `get_vendor_market_location` | Market vendor booth/location field |
| "Other seafood vendors in [county]?" | `get_county_vendors` | Org → county from market locations |
| "When is [vendor]'s next popup?" | `get_vendor_popups` | Popup markets for org |
| "What does [vendor] have today?" | `list_catch` (cross-org) | Public catch data |

All read-only. All public market information. No privacy concerns.

---

---

## Capability-Mediated Agent Architecture

### The Autonomy Gap
Standard MCP is reactive — human initiates, agent responds. For vendors at markets and customers expecting instant answers, we need **autonomous agents with bounded authority**.

### Three-Layer Model

1. **Host / Management Plane** (main Fresh Catch worker)
   - Owns database, enforces permissions, serves admin UI
   - The authority — never runs untrusted code directly
   - Validates every agent call against capability manifest

2. **Agent / Execution Plane** (sandboxed Dynamic Workers)
   - Each agent declares capabilities in manifest
   - Acts autonomously within bounds (responds to events, not just human prompts)
   - Examples:
     - Customer chat agent: `["read:catch", "read:markets", "create:order", "send:message"]`
     - Inventory nudge agent: `["read:catch", "send:notification"]`
     - Social posting agent: `["read:catch", "read:markets", "external:social"]`

3. **Client / Presentation Plane** (browser, Claude Desktop, chat UI)
   - Receives results, may initiate or just consume

### Event-Driven Autonomy

Agents don't poll. The host emits events. Agents react within capability bounds.

| Event | Agent | Action |
|-------|-------|--------|
| `chat:messageReceived` | Customer chat agent | Responds with tool calls if vendor offline |
| `catch:updated` | Social media agent | Posts to connected platforms |
| `order:created` | Notification agent | Alerts vendor (push/SMS) |
| `market:approaching` | Reminder agent | Checks if catch is stale, nudges vendor |

### Cloudflare Primitives

| Concept | Primitive |
|---------|-----------|
| Host service | Dispatch Worker |
| Sandboxed agent | Dynamic Worker |
| Communication | Service Binding (RPC) |
| Permission boundary | Capability manifest |
| Egress control | Outbound Worker |

### Security: Capability Tokens vs Sessions

Agents don't get "Evan's full session." They get a **scoped capability token**:
- Declares allowed operations (read:catch, create:order)
- Bound to a specific org
- Validated on every call to the host service
- Even a compromised agent can only do what its manifest allows

---

## What This Doesn't Include (Deferred)

- Full marketplace search/aggregation engine
- Price comparison across vendors
- Recommendation engine
- Vendor analytics/insights from MCP data
- Third-party MCP client integrations beyond Claude Desktop
- Automated social media posting (could be a scheduled agent later)

---

## Connection to Existing Architecture

| Existing | Becomes |
|----------|---------|
| voice-tools.ts | Single source of truth for voice AND MCP tool schemas |
| voice-command.ts | One of N MCP clients (the voice one) |
| CommandBar | MCP client with admin-scoped tools |
| ChatSheet | MCP client with customer-scoped tools + AI agent |
| AdminLayoutClient command router | MCP tool execution handler |
| Server functions | MCP tool handlers (unchanged) |
| Org Durable Object | Auth/isolation boundary for MCP |
