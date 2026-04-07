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
} from "./voice-tools";
import {
  handleListCatch,
  handleGetMarkets,
  handleGetVendorPopups,
  handleGetMarketVendors,
} from "./tool-handlers";
import type { McpDurableObject } from "@/mcp/durableObject";

// --- Types ---

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type ToolHandlerFn = (
  rawInput: unknown,
  organizationId: string,
) => Promise<ToolResult>;

type ToolRegistration = {
  description: string;
  schema: Record<string, unknown>;
  handler: ToolHandlerFn;
};

// --- Tool registry mapping ---

const toolRegistry: Record<string, ToolRegistration> = {
  list_catch: {
    description: "Returns current catch listing for the org",
    schema: ListCatchInputSchema.shape,
    handler: handleListCatch,
  },
  get_markets: {
    description: "Returns market schedule for the org",
    schema: GetMarketsInputSchema.shape,
    handler: handleGetMarkets,
  },
  get_vendor_popups: {
    description:
      "Returns upcoming popup markets with name, schedule, expiresAt, and location",
    schema: GetVendorPopupsInputSchema.shape,
    handler: handleGetVendorPopups,
  },
  get_market_vendors: {
    description: "Returns list of vendors at a specific market",
    schema: GetMarketVendorsInputSchema.shape,
    handler: handleGetMarketVendors,
  },
};

// --- Server creation ---

function createServer(): McpServer {
  const server = new McpServer({
    name: "fresh-catch",
    version: "1.0.0",
  });

  for (const [name, tool] of Object.entries(toolRegistry)) {
    server.tool(name, tool.description, tool.schema, async (args) => {
      return tool.handler(args, "");
    });
  }

  return server;
}

// --- Audit-wrapped handler ---

/**
 * Create a handler function that wraps tool execution with McpDO audit logging.
 * The returned function is called from McpDO.fetch().
 */
export function createMcpRequestHandler(options: {
  organizationId: string;
  sessionId: string;
  mcpDO: McpDurableObject;
}): (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response> {
  const { organizationId, sessionId, mcpDO } = options;

  const server = new McpServer({
    name: "fresh-catch",
    version: "1.0.0",
  });

  // Register tools with audit-logging wrapper
  for (const [name, tool] of Object.entries(toolRegistry)) {
    server.tool(name, tool.description, tool.schema, async (args) => {
      const startMs = Date.now();
      let result: ToolResult;

      try {
        result = await tool.handler(args, organizationId);
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

// --- Standalone server for testing ---

export { createServer };
