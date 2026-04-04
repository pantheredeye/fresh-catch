# MCP Server Per Vendor Instance - Architecture Concept

## Date: 2026-04-04

## Insight

The existing voice tool registry (`src/api/voice-tools.ts`) and server functions are already 80% of an MCP server. The VoiceTool type maps nearly 1:1 to MCP tool definitions. The command bar is already an MCP client in spirit — natural language → intent → scoped tool call.

## What Exists Today

| Component | File | MCP Analog |
|-----------|------|------------|
| Voice tool registry | `src/api/voice-tools.ts` | Tool definitions |
| Server functions | `market-functions.ts`, `catch-functions.ts`, `chat/functions.ts` | Tool handlers |
| Command bar | `src/components/CommandBar.tsx` | MCP client (voice) |
| Intent resolver | `src/api/voice-command.ts` | Natural language → tool call |
| Org Durable Object | `src/session/durableObject.ts` | Isolation/auth boundary |
| Chat | `src/chat/functions.ts` | Human transport (becomes AI+human) |

## Architecture

```
Vendor Instance (Organization DO)
├── MCP Server (at /mcp/:orgSlug)
│   ├── Resources: catch://today, markets://schedule, orders://pending
│   ├── Tools (role-scoped, sourced from voice-tools.ts)
│   │   ├── [admin] update_catch, create_market, cancel_popup, update_market, etc.
│   │   ├── [customer] list_catch, get_markets, create_order, get_order_status
│   │   └── [platform] search_catch (cross-vendor)
│   └── Prompts: vendor-assistant, customer-assistant
│
├── Existing Clients → MCP Clients
│   ├── CommandBar (voice/text → MCP tool)
│   ├── ChatSheet (customer → AI agent → MCP tools → response)
│   └── Admin UI (forms call server functions directly, or via MCP)
│
└── New Clients
    ├── Claude Desktop (vendor connects instance)
    ├── Scheduled agents (auto-archive, social posting, nudges)
    └── Customer search (cross-vendor federation)
```

## Key Unlock: Smart Customer Chat

Chat is currently human-to-human. With MCP-backed AI agent:
- Customer asks routine questions → AI answers from MCP tools (no vendor needed)
- Customer places orders conversationally → AI calls create_order tool
- Vendor sees all AI responses, can take over anytime
- Messages flagged [AI] vs human

## Phases

1. **MCP scaffold**: Wrap voice-tools registry as MCP tool defs, SSE/Streamable HTTP transport at `/mcp/:orgSlug`, read-only tools first
2. **Customer chat agent**: Claude API + MCP tools for answering "what's available" queries, vendor override
3. **Full tool access**: Write tools via MCP, command bar becomes MCP client, Claude Desktop integration
4. **Cross-vendor**: Platform MCP aggregator for marketplace search

## Connection to Existing Memories

- Voice UX: "dedicated mic per page" stays — MCP doesn't change the UX, it's the backend unification
- Command bar: "extends to customers" — customer command bar = MCP client with customer-scoped tools
- Both existing approaches become clients of the same MCP server

## Unresolved

1. MCP transport: SSE vs Streamable HTTP? (Streamable HTTP is newer, better for Workers)
2. Auth model: API key per vendor? Session-derived for in-app clients?
3. AI agent model: Claude API direct, or use Claude Agent SDK?
4. Customer chat: AI-first with human takeover, or human-first with AI assist?
5. Cross-vendor: how to handle vendor privacy (some might not want catch data federated)?
