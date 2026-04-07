/**
 * Voice tool registry — single source of truth for all voice/MCP actions.
 * Exports two formats:
 *   - buildCommandPrompt(): LLM system prompt for voice command interpretation
 *   - mcpFormat(): MCP Tool[] definitions for the Model Context Protocol server
 */

import { z } from "zod";

// --- Zod input schemas for read-only tools ---

export const ListCatchInputSchema = z.object({
  itemName: z.string().optional().describe("Filter by item name (partial match)"),
});
export type ListCatchInput = z.infer<typeof ListCatchInputSchema>;

export const GetMarketsInputSchema = z.object({
  activeOnly: z.boolean().optional().describe("Only return active markets"),
  type: z.enum(["regular", "popup"]).optional().describe("Filter by market type"),
});
export type GetMarketsInput = z.infer<typeof GetMarketsInputSchema>;

export const GetVendorPopupsInputSchema = z.object({});
export type GetVendorPopupsInput = z.infer<typeof GetVendorPopupsInputSchema>;

export const GetMarketVendorsInputSchema = z.object({
  marketId: z.string().describe("ID of the market to list vendors for"),
});
export type GetMarketVendorsInput = z.infer<typeof GetMarketVendorsInputSchema>;

// --- Types ---

export type VoiceCommandResult = {
  intent: string;
  confidence: number;
  data: Record<string, unknown>;
  interpretation: string;
  rawTranscript: string;
  reviewType: string;
};

type SchemaField = {
  type: string;
  optional?: boolean;
  description?: string;
};

type VoiceTool = {
  description: string;
  schema: Record<string, SchemaField>;
  reviewType: string;
  /** Roles allowed to use this tool. Omit = admin-only (owner, manager). */
  roles?: string[];
};

// --- Registry ---

export const voiceTools: Record<string, VoiceTool> = {
  update_catch: {
    description: "Update today's fresh catch with what's available",
    schema: {
      headline: { type: "string", description: "Short catchy headline" },
      items: {
        type: "array of { name: string, note: string }",
        description: "Fish items with colorful descriptions",
      },
      summary: { type: "string", description: "One-sentence summary" },
    },
    reviewType: "catch",
  },
  create_market: {
    description: "Add a new recurring market",
    schema: {
      name: { type: "string", description: "Market name" },
      schedule: { type: "string", description: "Schedule description" },
      locationDetails: {
        type: "string",
        optional: true,
        description: "Location info",
      },
      customerInfo: {
        type: "string",
        optional: true,
        description: "Customer-facing info",
      },
      catchPreview: {
        type: "string",
        optional: true,
        description: "JSON: { items: [{ name, note }] }",
      },
    },
    reviewType: "market-create",
  },
  create_popup: {
    description: "Create a temporary popup market event",
    schema: {
      name: { type: "string", description: "Popup name" },
      schedule: {
        type: "string",
        description: "When the popup happens (resolve relative dates)",
      },
      expiresAt: {
        type: "string",
        description: "ISO date when popup expires",
      },
      locationDetails: {
        type: "string",
        optional: true,
        description: "Location info",
      },
      customerInfo: {
        type: "string",
        optional: true,
        description: "Customer-facing info",
      },
      catchPreview: {
        type: "string",
        optional: true,
        description: "JSON: { items: [{ name, note }] }",
      },
    },
    reviewType: "popup-create",
  },
  update_market: {
    description: "Update details on an existing market (name match)",
    schema: {
      marketId: {
        type: "string",
        description: "ID of market to update (matched from context)",
      },
      name: { type: "string", optional: true, description: "New name" },
      schedule: {
        type: "string",
        optional: true,
        description: "New schedule",
      },
      locationDetails: {
        type: "string",
        optional: true,
        description: "New location info",
      },
      customerInfo: {
        type: "string",
        optional: true,
        description: "New customer-facing info",
      },
    },
    reviewType: "market-update",
  },
  update_market_catch: {
    description: "Update what fish are available at a specific market",
    schema: {
      marketId: {
        type: "string",
        description: "ID of market to update (matched from context)",
      },
      catchPreview: {
        type: "string",
        description: "JSON: { items: [{ name, note }] }",
      },
    },
    reviewType: "market-catch",
  },
  list_catch: {
    description: "Returns current catch listing for the org",
    schema: {
      itemName: {
        type: "string",
        optional: true,
        description: "Filter by item name (partial match)",
      },
    },
    reviewType: "read-only",
    roles: ["customer", "owner", "manager"],
  },
  get_markets: {
    description: "Returns market schedule for the org",
    schema: {
      activeOnly: {
        type: "boolean",
        optional: true,
        description: "Only return active markets",
      },
      type: {
        type: "string",
        optional: true,
        description: "Filter by market type (regular or popup)",
      },
    },
    reviewType: "read-only",
    roles: ["customer", "owner", "manager"],
  },
  get_vendor_popups: {
    description:
      "Returns upcoming popup markets for the org with name, schedule, expiresAt, and location",
    schema: {},
    reviewType: "read-only",
    roles: ["customer", "owner", "manager"],
  },
  get_market_vendors: {
    description:
      "Returns list of vendors at a specific market with name and slug",
    schema: {
      marketId: {
        type: "string",
        description: "ID of the market to list vendors for",
      },
    },
    reviewType: "read-only",
    roles: ["customer", "owner", "manager"],
  },
};

// --- Business context type ---

export type MarketContext = {
  id: string;
  name: string;
  type: string;
  schedule: string;
  active: boolean;
  subtitle: string | null;
  locationDetails: string | null;
  customerInfo: string | null;
  catchPreview: string | null;
  expiresAt: Date | null;
};

export type BusinessContext = {
  markets: MarketContext[];
};

// --- Prompt builder ---

function describeSchema(schema: Record<string, SchemaField>): string {
  const fields = Object.entries(schema).map(([name, field]) => {
    const opt = field.optional ? " (optional)" : "";
    const desc = field.description ? ` — ${field.description}` : "";
    return `  - ${name}: ${field.type}${opt}${desc}`;
  });
  return fields.join("\n");
}

function filterToolsByRole(
  tools: Record<string, VoiceTool>,
  role: string,
): Record<string, VoiceTool> {
  if (role === "owner" || role === "manager") return tools;

  return Object.fromEntries(
    Object.entries(tools).filter(([, tool]) => tool.roles?.includes(role)),
  );
}

export function buildCommandPrompt(
  tools: Record<string, VoiceTool>,
  context: BusinessContext,
  role: string = "owner",
): string {
  const filteredTools = filterToolsByRole(tools, role);
  const today = new Date().toISOString().split("T")[0];

  const toolDescriptions = Object.entries(filteredTools)
    .map(
      ([name, tool]) =>
        `### ${name}\n${tool.description}\nSchema:\n${describeSchema(tool.schema)}`,
    )
    .join("\n\n");

  const marketList =
    context.markets.length > 0
      ? context.markets
          .map((m) => {
            const parts = [
              `- ${m.name} (id: ${m.id}, type: ${m.type}, schedule: ${m.schedule}, active: ${m.active})`,
            ];
            if (m.subtitle) parts.push(`  subtitle: ${m.subtitle}`);
            if (m.locationDetails) parts.push(`  location: ${m.locationDetails}`);
            if (m.customerInfo) parts.push(`  customerInfo: ${m.customerInfo}`);
            if (m.catchPreview) {
              // Truncate long catch previews to save tokens
              const preview = m.catchPreview.length > 200
                ? m.catchPreview.slice(0, 200) + "..."
                : m.catchPreview;
              parts.push(`  catchPreview: ${preview}`);
            }
            if (m.expiresAt) parts.push(`  expiresAt: ${new Date(m.expiresAt).toISOString()}`);
            return parts.join("\n");
          })
          .join("\n")
      : "No markets configured yet.";

  return `You are a voice command interpreter for a seafood market business.
Today's date: ${today}

## Available Actions

${toolDescriptions}

## Existing Markets

${marketList}

## Instructions

Given the user's voice input, determine which action they want to perform and extract the relevant data.

Return ONLY valid JSON with this exact shape:
{
  "intent": "<tool_name from the list above>",
  "confidence": <0.0 to 1.0>,
  "data": { <fields matching the chosen tool's schema> },
  "interpretation": "<human-readable summary of what will happen>"
}

Rules:
- Match market names fuzzily to existing markets and use their ID in data
- If the event sounds temporary or one-time, use create_popup (not create_market)
- Resolve relative dates ("this Saturday", "tomorrow") to absolute dates using today's date
- Set confidence lower if the intent is ambiguous
- The interpretation should be a plain English summary like "Update catch preview for Folly Beach Market"
- If you cannot determine the intent, use confidence: 0 and interpretation explaining why
- For update_market: ONLY include fields the user explicitly wants to change. Do NOT echo back unchanged fields. The current values are shown above for each market.
- If multiple markets partially match the name, set confidence lower and mention the ambiguity in interpretation`;
}

// --- MCP format export ---

import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

/** Map a SchemaField.type string to a JSON Schema type. */
function toJsonSchemaType(fieldType: string): object {
  const lower = fieldType.toLowerCase();
  if (lower === "string") return { type: "string" };
  if (lower === "number" || lower === "integer") return { type: "number" };
  if (lower === "boolean") return { type: "boolean" };
  // Complex or freeform types (e.g. "array of { name, note }") → string with description
  return { type: "string" };
}

/**
 * Convert voice tool registry into MCP Tool definitions.
 * Role filtering works the same as buildCommandPrompt:
 * owner/manager see all tools, other roles only see tools with matching roles[].
 */
export function mcpFormat(role: string = "owner"): McpTool[] {
  const filtered = filterToolsByRole(voiceTools, role);

  return Object.entries(filtered).map(([name, tool]) => {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [fieldName, field] of Object.entries(tool.schema)) {
      const prop: Record<string, unknown> = { ...toJsonSchemaType(field.type) };
      if (field.description) prop.description = field.description;
      properties[fieldName] = prop;
      if (!field.optional) required.push(fieldName);
    }

    return {
      name,
      description: tool.description,
      inputSchema: {
        type: "object" as const,
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    };
  });
}
