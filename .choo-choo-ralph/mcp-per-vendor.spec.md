---
title: "MCP Per Vendor"
created: 2026-04-04
poured: []
iteration: 0
auto_discovery: false
auto_learnings: false
---

<project_specification>
<project_name>MCP Per Vendor</project_name>
<overview>Expose existing voice tool registry and server functions as MCP server per vendor org. Four phases: scaffold + read-only tools, customer chat agent, write tools + command bar migration, customer voice + cross-vendor queries. Vision doc: .choo-choo-ralph/mcp-per-vendor-vision.md</overview>
<context>
  <existing_patterns>
    - Voice tool registry: src/api/voice-tools.ts (VoiceTool type: description, schema, reviewType, roles)
    - Voice command endpoint: src/api/voice-command.ts (POST /api/voice/command, intent resolution with LLM)
    - Voice pipeline: src/api/voice-pipeline.ts (Whisper transcription + Llama 3.3-70B formatting)
    - Server functions: market-functions.ts (createMarket, updateMarket, cancelPopup, etc.), catch-functions.ts (publishCatch, clearCatch), chat/functions.ts (createConversation, getMessages, sendMessage, etc.)
    - Command execution router: src/layouts/AdminLayoutClient.tsx (intent → server function mapping)
    - Org isolation: Durable Objects in src/session/durableObject.ts
    - Chat WebSocket: /ws/chat/{conversationId}
    - buildCommandPrompt() in voice-tools.ts generates LLM system prompt from tool registry + current org context
    - Customer chat already has EmailPromptBubble for email collection
    - Chat notification emails already implemented (Resend)
  </existing_patterns>
  <integration_points>
    - voice-tools.ts: add mcpFormat() export alongside existing voice format
    - worker.tsx: add /mcp/:orgSlug route
    - Admin settings page: API key generation UI
    - ChatSheet.tsx: integrate AI agent responses
    - CommandBar.tsx + AdminLayoutClient.tsx: migrate from hardcoded router to MCP client
    - BottomNavigation.v2.tsx: add customer mic button (Phase 4)
  </integration_points>
  <new_technologies>
    - @modelcontextprotocol/sdk (MCP server SDK)
    - Streamable HTTP transport (MCP's newer transport, Workers-friendly)
    - Claude API (@anthropic-ai/sdk) for customer chat agent
  </new_technologies>
  <conventions>
    - RWSDK server functions with "use server"
    - Org-scoped data via ctx.currentOrganization
    - Role-based access: owner/manager = admin, customer = customer
    - Chat messages tagged by sender type (vendor/customer)
  </conventions>
</context>
<tasks>
  <task id="mcp-scaffold" priority="0" category="feature">
    <title>MCP server scaffold with read-only tools and Claude Desktop connectivity</title>
    <description>
Create MCP server endpoint at /mcp/:orgSlug wrapping existing voice-tools registry. Phase 1 focuses on read-only tools and proving the pattern works with Claude Desktop.

Deliverables:
1. Dual-export from voice-tools.ts (voice format + MCP tool definitions via mcpFormat())
2. MCP server handler at src/api/mcp-server.ts using @modelcontextprotocol/sdk
3. Streamable HTTP transport at /mcp/:orgSlug route in worker.tsx
4. Auth: API key per org (generated in admin settings, stored in org record) for external clients, session passthrough for in-app
5. Read-only tools: list_catch, get_markets, get_vendor_popups, get_market_vendors
6. MCP Resources: catch://today, markets://schedule
7. Vendor-assistant prompt template
8. Claude Desktop integration test

Vision doc: .choo-choo-ralph/mcp-per-vendor-vision.md
    </description>
    <steps>
      - Install @modelcontextprotocol/sdk, research Streamable HTTP on Workers
      - Add mcpFormat() export to voice-tools.ts that converts VoiceTool → MCP tool definition
      - Define read-only tool schemas: list_catch, get_markets, get_vendor_popups, get_market_vendors
      - Create src/api/mcp-server.ts: MCP server with tool registration, resource definitions, prompt templates
      - Implement tool handlers that call existing DB queries (same patterns as server functions)
      - Add /mcp/:orgSlug route in worker.tsx with org resolution middleware
      - Add API key field to org schema (migration), generation UI in admin settings
      - Auth middleware: check API key header or session cookie, resolve org context
      - Test with Claude Desktop: configure MCP server, query catch/markets conversationally
      - Write brief setup doc for connecting Claude Desktop
    </steps>
    <test_steps>
      1. Generate API key in admin settings for a vendor org
      2. Configure Claude Desktop with MCP server URL + API key
      3. "What's the current catch?" → list_catch returns structured data
      4. "When are the markets this week?" → get_markets returns schedule
      5. "Who else is at Adobe Ranch?" → get_market_vendors returns vendor list
      6. Bad/missing API key → 401 rejected
      7. Can't access other org's data via one org's API key
      8. MCP Resources (catch://today) return current state
    </test_steps>
    <review></review>
  </task>
  <task id="mcp-chat-agent" priority="1" category="feature">
    <title>Customer chat AI agent backed by MCP tools</title>
    <description>
When a customer sends a chat message and the vendor is offline (or optionally always), an AI agent responds using MCP read tools. The vendor sees all AI responses tagged [AI] and can take over anytime.

Deliverables:
1. Claude API integration for generating chat responses with tool use
2. Tool injection: MCP read tool definitions passed as Claude function definitions
3. AI response pipeline: customer message → check vendor online → if offline, Claude generates response using tools → send as [AI]-tagged message
4. Vendor visibility: AI messages clearly marked in both admin and customer chat UIs
5. Vendor override: when vendor sends a message, AI goes quiet for that conversation
6. Gap logging: when AI can't answer (no matching tool), log the question for the vendor to see

This is where the real user interaction data comes from — seeing what customers actually ask.

Files: src/chat/functions.ts (new AI response function), src/chat/ai-agent.ts (new), ChatSheet.tsx (AI message styling), AdminChatSheet (AI message visibility + gap log)
    </description>
    <steps>
      - Install @anthropic-ai/sdk for Claude API
      - Create src/chat/ai-agent.ts: takes customer message + conversation history + org context → Claude API call with MCP tools as functions
      - Add vendor-offline detection (WebSocket tag check, existing role tagging)
      - Wire into chat message handler: if vendor offline → AI responds
      - Tag AI messages with senderType: "ai" in database
      - Style AI messages differently in ChatSheet (subtle [AI] badge, maybe slightly different bubble color)
      - Show AI messages in admin chat view with clear [AI] tag
      - Vendor sends message → set flag to suppress AI for that conversation (until vendor goes offline again)
      - Log unanswerable questions: store in a simple table or jsonl, surface in admin
      - Add ANTHROPIC_API_KEY to wrangler.jsonc secrets
    </steps>
    <test_steps>
      1. Vendor offline + customer asks "what's fresh?" → AI responds with catch data
      2. AI response tagged [AI] in both customer and admin views
      3. Vendor comes online, sends message → AI stops responding in that conversation
      4. Vendor goes offline again → AI resumes for new messages
      5. Customer asks something AI can't answer → logged, AI says "I'll let [vendor] know you asked about this"
      6. Admin can see gap log of unanswered questions
      7. AI uses conversational tone appropriate to a seafood market (not corporate)
    </test_steps>
    <review></review>
  </task>
  <task id="mcp-write-tools" priority="2" category="feature">
    <title>MCP write tools + command bar migration to MCP client</title>
    <description>
Add write operations to MCP (create_order, update_catch, send_message) and migrate the admin command bar from its hardcoded intent router to an MCP client.

Deliverables:
1. Write tool definitions: create_order, update_catch, update_market_catch, send_message
2. Customer chat agent can now place orders (confirm before executing)
3. Command bar becomes MCP client: voice → transcription → Claude with MCP tools → review → execute
4. AdminLayoutClient command router replaced with MCP tool execution
5. Claude Desktop can do full vendor management (update catch, manage markets)

Files: voice-tools.ts (add write tools), mcp-server.ts (register write handlers), AdminLayoutClient.tsx (migrate to MCP client), CommandBar.tsx (minor wiring changes)
    </description>
    <steps>
      - Add write tool definitions to voice-tools.ts: create_order, update_catch, update_market_catch, send_message
      - Implement MCP write tool handlers with proper auth (admin-only for catch/market, customer for orders)
      - Add order confirmation flow in chat agent: AI proposes order → customer confirms → AI executes create_order
      - Refactor AdminLayoutClient command router: instead of switch on intent, call MCP tools directly
      - CommandBar voice pipeline → MCP tool resolution (replaces voice-command.ts intent matching)
      - Test Claude Desktop with write operations
      - Ensure all write operations still go through review/confirmation in admin UI
    </steps>
    <test_steps>
      1. Customer in chat says "order 2 lbs mahi for Saturday" → AI proposes order → customer confirms → order created
      2. Vendor via Claude Desktop: "update catch, add grouper at $16" → catch updated
      3. Admin command bar voice: "cancel tomorrow's popup" → review screen → confirm → popup cancelled
      4. Write operations require proper role (customer can't update_catch, admin can't create_order for another org)
      5. All existing command bar functionality still works after migration
    </test_steps>
    <review></review>
  </task>
  <task id="mcp-customer-voice" priority="2" category="feature">
    <title>Customer command bar + simple cross-vendor queries</title>
    <description>
Add mic button to customer bottom nav for voice ordering and natural questions. Include simple cross-vendor queries (who's at this market, where's this vendor, other vendors in county).

Deliverables:
1. Customer mic button in BottomNavigation (alongside Chat and Quick Order)
2. Customer-scoped MCP tools: list_catch, get_markets, create_order, get_order_status
3. Cross-vendor read tools: get_market_vendors, get_vendor_market_location, get_county_vendors, get_vendor_popups
4. Voice ordering: "order 3 pounds grouper for Saturday" → confirmation card → done
5. Natural queries: "who else is at Adobe Ranch?" → list of vendors

Files: BottomNavigation.v2.tsx (customer mic), CommandBar.tsx (customer mode), voice-tools.ts (customer tool definitions), mcp-server.ts (cross-vendor handlers)
    </description>
    <steps>
      - Add customer voice tool definitions (read + order) to voice-tools.ts with roles: ["customer"]
      - Add cross-vendor tool definitions: get_market_vendors, get_vendor_market_location, get_county_vendors
      - Implement cross-vendor handlers (query across orgs for public market data)
      - Add mic button to BottomNavigation.v2.tsx (customer mode)
      - Wire CommandBar for customer context: customer-scoped tools, customer-friendly review UI
      - Voice order flow: transcribe → resolve tools → show confirmation card → create_order on confirm
      - Natural query flow: transcribe → resolve tools → display answer inline
    </steps>
    <test_steps>
      1. Customer taps mic → "order grouper for Saturday" → confirmation card → order placed
      2. "What's fresh today?" → catch listing displayed
      3. "Who else is at Adobe Ranch?" → vendor list
      4. "Where is Fresh Catch at the Saturday market?" → location info (if set)
      5. "When is Evan's next popup?" → popup schedule
      6. Customer can't access admin tools via voice
      7. Works on mobile Safari and Chrome
    </test_steps>
    <review></review>
  </task>
</tasks>
</project_specification>
