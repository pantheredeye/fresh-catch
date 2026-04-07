/**
 * MCP server handler framework.
 * Initializes McpServer, registers tools from voice-tools registry,
 * routes tool calls to handler functions, wraps with McpDO audit logging.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import {
  ListCatchInputSchema,
  GetMarketsInputSchema,
  GetVendorPopupsInputSchema,
  GetMarketVendorsInputSchema,
  CreateOrderInputSchema,
  UpdateCatchInputSchema,
  CreateMarketInputSchema,
  CreatePopupInputSchema,
  UpdateMarketInputSchema,
  UpdateMarketCatchInputSchema,
  SendMessageInputSchema,
} from "./voice-tools";
import {
  handleListCatch,
  handleGetMarkets,
  handleGetVendorPopups,
  handleGetMarketVendors,
  handleCreateOrder,
  handleUpdateCatch,
  handleCreateMarket,
  handleCreatePopup,
  handleUpdateMarket,
  handleUpdateMarketCatch,
  handleSendMessage,
} from "./tool-handlers";
import { db } from "@/db";
import type { McpDurableObject, ToolTier } from "@/mcp/durableObject";

// --- Types ---

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type ToolHandlerFn = (
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
) => Promise<ToolResult>;

type ToolRegistration = {
  description: string;
  schema: Record<string, unknown>;
  handler: ToolHandlerFn;
  tier: ToolTier;
};

// --- Rate limit config ---

export const TIER_LIMITS: Record<ToolTier, { maxCalls: number; windowMs: number }> = {
  read: { maxCalls: 1000, windowMs: 60_000 },
  write: { maxCalls: 100, windowMs: 60_000 },
  llm: { maxCalls: 10, windowMs: 60_000 },
};

// --- Tool registry mapping ---

export const toolRegistry: Record<string, ToolRegistration> = {
  list_catch: {
    description: "Returns current catch listing for the org",
    schema: ListCatchInputSchema.shape,
    handler: handleListCatch,
    tier: "read",
  },
  get_markets: {
    description: "Returns market schedule for the org",
    schema: GetMarketsInputSchema.shape,
    handler: handleGetMarkets,
    tier: "read",
  },
  get_vendor_popups: {
    description:
      "Returns upcoming popup markets with name, schedule, expiresAt, and location",
    schema: GetVendorPopupsInputSchema.shape,
    handler: handleGetVendorPopups,
    tier: "read",
  },
  get_market_vendors: {
    description: "Returns list of vendors at a specific market",
    schema: GetMarketVendorsInputSchema.shape,
    handler: handleGetMarketVendors,
    tier: "read",
  },
  create_order: {
    description: "Customer creates an order for pickup at a market",
    schema: CreateOrderInputSchema.shape,
    handler: handleCreateOrder,
    tier: "write",
  },
  update_catch: {
    description: "Update today's fresh catch with what's available",
    schema: UpdateCatchInputSchema.shape,
    handler: handleUpdateCatch,
    tier: "write",
  },
  create_market: {
    description: "Add a new recurring market",
    schema: CreateMarketInputSchema.shape,
    handler: handleCreateMarket,
    tier: "write",
  },
  create_popup: {
    description: "Create a temporary popup market event",
    schema: CreatePopupInputSchema.shape,
    handler: handleCreatePopup,
    tier: "write",
  },
  update_market: {
    description: "Update details on an existing market",
    schema: UpdateMarketInputSchema.shape,
    handler: handleUpdateMarket,
    tier: "write",
  },
  update_market_catch: {
    description: "Update what fish are available at a specific market",
    schema: UpdateMarketCatchInputSchema.shape,
    handler: handleUpdateMarketCatch,
    tier: "write",
  },
  send_message: {
    description: "Send a chat message in a conversation",
    schema: SendMessageInputSchema.shape,
    handler: handleSendMessage,
    tier: "write",
  },
};

// --- Resource + prompt helpers ---

async function readCatchResource(organizationId: string): Promise<string> {
  try {
    const catchUpdate = await db.catchUpdate.findFirst({
      where: { organizationId, status: "live" },
      orderBy: { createdAt: "desc" },
    });

    if (!catchUpdate) {
      return JSON.stringify({ items: [], message: "No catch currently available." });
    }

    const content = JSON.parse(catchUpdate.formattedContent) as {
      headline?: string;
      items?: Array<{ name: string; note: string }>;
      summary?: string;
    };

    return JSON.stringify({
      headline: content.headline ?? null,
      items: content.items ?? [],
      summary: content.summary ?? null,
      updatedAt: catchUpdate.createdAt.toISOString(),
    });
  } catch {
    return JSON.stringify({ items: [], message: "Error reading catch data." });
  }
}

async function readMarketsResource(organizationId: string): Promise<string> {
  try {
    const markets = await db.market.findMany({
      where: { organizationId, active: true },
      orderBy: [{ county: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return JSON.stringify({
      markets: markets.map((m) => ({
        id: m.id,
        name: m.name,
        schedule: m.schedule,
        type: m.type,
        active: m.active,
        locationDetails: m.locationDetails,
        customerInfo: m.customerInfo,
        county: m.county,
        city: m.city,
      })),
    });
  } catch {
    return JSON.stringify({ markets: [], message: "Error reading market data." });
  }
}

function buildVendorAssistantPrompt(orgName: string): string {
  return `You are a friendly assistant for ${orgName}, a local seafood vendor.

## Personality
- Warm and knowledgeable, like chatting with someone at the fish counter
- Enthusiastic about fresh seafood without being salesy
- Use casual, approachable language — not corporate speak
- If you don't know something, say so honestly

## What you can do
- Answer questions about today's fresh catch (what's available, pricing notes, preparation tips)
- Share market schedule and location details
- Help customers find which markets the vendor attends
- Provide general seafood knowledge (cooking tips, seasonality, sustainability)

## Guidelines
- Always check the current catch data before answering "what's fresh" questions
- When listing items, include the vendor's own notes/descriptions
- If no catch data is available, let the customer know and suggest checking back
- Keep responses concise — customers want quick answers
- Reference specific market names and schedules when relevant`;
}

function registerResourcesAndPrompts(
  server: McpServer,
  organizationId: string,
  orgName?: string,
): void {
  // Resources
  server.resource(
    "today-catch",
    "catch://today",
    { description: "Current catch listing — what's fresh today" },
    async () => ({
      contents: [
        {
          uri: "catch://today",
          mimeType: "application/json",
          text: await readCatchResource(organizationId),
        },
      ],
    }),
  );

  server.resource(
    "market-schedule",
    "markets://schedule",
    { description: "Market schedule with locations and times" },
    async () => ({
      contents: [
        {
          uri: "markets://schedule",
          mimeType: "application/json",
          text: await readMarketsResource(organizationId),
        },
      ],
    }),
  );

  // Prompts
  server.prompt(
    "vendor-assistant",
    "System prompt for a vendor-side AI assistant with full admin context",
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildVendorAssistantPrompt(orgName ?? "this seafood vendor"),
          },
        },
      ],
    }),
  );
}

// --- Server creation ---

function createServer(): McpServer {
  const server = new McpServer({
    name: "fresh-catch",
    version: "1.0.0",
  });

  for (const [name, tool] of Object.entries(toolRegistry)) {
    server.tool(name, tool.description, tool.schema, async (args) => {
      return tool.handler(args, "", undefined);
    });
  }

  registerResourcesAndPrompts(server, "");

  return server;
}

// --- Audit-wrapped handler ---

/**
 * Create a handler function that wraps tool execution with McpDO audit logging.
 * The returned function is called from McpDO.fetch().
 */
export function createMcpRequestHandler(options: {
  organizationId: string;
  orgName?: string;
  sessionId: string;
  callerRole?: string;
  mcpDO: McpDurableObject;
}): (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response> {
  const { organizationId, orgName, sessionId, callerRole, mcpDO } = options;

  const server = new McpServer({
    name: "fresh-catch",
    version: "1.0.0",
  });

  // Register tools with rate-limit + audit-logging wrapper
  for (const [name, tool] of Object.entries(toolRegistry)) {
    server.tool(name, tool.description, tool.schema, async (args) => {
      const startMs = Date.now();

      // Rate limit check
      const limit = TIER_LIMITS[tool.tier];
      const windowStart = startMs - (startMs % limit.windowMs);
      try {
        const count = mcpDO.incrementRateLimit(tool.tier, windowStart);
        if (count > limit.maxCalls) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `Rate limit exceeded for ${tool.tier} tier: ${limit.maxCalls} calls per ${limit.windowMs / 1000}s. Try again later.`,
              },
            ],
          };
        }
      } catch {
        // Rate limiting must never crash the tool call
      }

      let result: ToolResult;

      try {
        result = await tool.handler(args, organizationId, callerRole);
      } catch (err) {
        result = {
          isError: true,
          content: [
            {
              type: "text",
              text: `Internal error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }

      // Audit log
      const durationMs = Date.now() - startMs;
      try {
        mcpDO.logToolCall({
          session_id: sessionId,
          tool_name: name,
          input_hash: hashInput(args),
          result_status: result.isError ? "error" : "success",
          timestamp: startMs,
          duration_ms: durationMs,
        });
      } catch {
        // Audit logging must never crash the tool call
      }

      return result;
    });
  }

  registerResourcesAndPrompts(server, organizationId, orgName);

  return createMcpHandler(server);
}

/**
 * Simple hash of tool input for audit deduplication.
 * Uses JSON.stringify — not cryptographic, just for log grouping.
 */
function hashInput(input: unknown): string {
  const str = JSON.stringify(input ?? {});
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

// --- Server card ---

export function getServerCard(): Record<string, unknown> {
  return {
    name: "fresh-catch",
    version: "1.0.0",
    description: "Fresh Catch seafood vendor MCP server",
    endpoint: "/mcp/{orgSlug}",
    transport: "streamable-http",
    capabilities: {
      tools: Object.entries(toolRegistry).map(([name, tool]) => ({
        name,
        description: tool.description,
        tier: tool.tier,
      })),
      resources: [
        { name: "today-catch", uri: "catch://today", description: "Current catch listing" },
        { name: "market-schedule", uri: "markets://schedule", description: "Market schedule with locations" },
      ],
      prompts: [
        { name: "vendor-assistant", description: "System prompt for vendor-side AI assistant" },
      ],
    },
  };
}

// --- Standalone server for testing ---

export { createServer };
