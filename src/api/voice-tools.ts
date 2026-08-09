/**
 * Voice tool registry — single source of truth for all voice/MCP actions.
 * Exports mcpFormat(): MCP Tool[] definitions for the Model Context Protocol server.
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

export const GetVendorMarketLocationInputSchema = z.object({
  vendorSlug: z.string().describe("Organization slug of the vendor"),
  marketId: z.string().describe("ID of the market to check"),
});
export type GetVendorMarketLocationInput = z.infer<typeof GetVendorMarketLocationInputSchema>;

export const GetCountyVendorsInputSchema = z.object({
  county: z.string().describe("County name to search for vendors"),
});
export type GetCountyVendorsInput = z.infer<typeof GetCountyVendorsInputSchema>;

export const GetOrderStatusInputSchema = z.object({
  orderId: z.string().optional().describe("Order ID to look up"),
  latest: z.boolean().optional().describe("If true, return the most recent order"),
});
export type GetOrderStatusInput = z.infer<typeof GetOrderStatusInputSchema>;

// --- Zod input schemas for write tools ---

export const CreateOrderInputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe("Item name"),
        quantity: z.number().describe("Quantity requested"),
        unit: z.string().describe("Unit of measure (e.g. lbs, each)"),
      }),
    )
    .describe("Items to order"),
  pickupMarketId: z.string().describe("ID of the market for pickup"),
  pickupDate: z.string().describe("Desired pickup date (ISO format)"),
  customerNote: z
    .string()
    .optional()
    .describe("Optional note from the customer"),
  contactName: z
    .string()
    .optional()
    .describe("Customer name for the order"),
  contactEmail: z
    .string()
    .optional()
    .describe("Customer email for the order"),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const UpdateCatchInputSchema = z.object({
  headline: z.string().describe("Short catchy headline"),
  items: z
    .array(
      z.object({
        name: z.string().describe("Fish/item name"),
        note: z.string().describe("Colorful description"),
      }),
    )
    .describe("Fish items with descriptions"),
  summary: z.string().describe("One-sentence summary"),
});
export type UpdateCatchInput = z.infer<typeof UpdateCatchInputSchema>;

export const UpdateMarketCatchInputSchema = z.object({
  marketId: z
    .string()
    .describe("ID of market to update (matched from context)"),
  catchPreview: z
    .array(
      z.object({
        name: z.string().describe("Fish/item name"),
        note: z.string().describe("Description"),
      }),
    )
    .describe("Items available at this market"),
});
export type UpdateMarketCatchInput = z.infer<typeof UpdateMarketCatchInputSchema>;

export const CreateMarketInputSchema = z.object({
  name: z.string().describe("Market name"),
  schedule: z.string().describe("Schedule description"),
  locationDetails: z.string().optional().describe("Location info"),
  customerInfo: z.string().optional().describe("Customer-facing info"),
  catchPreview: z.string().optional().describe("JSON: { items: [{ name, note }] }"),
  active: z.boolean().optional().describe("Whether market is active"),
});
export type CreateMarketInput = z.infer<typeof CreateMarketInputSchema>;

export const CreatePopupInputSchema = z.object({
  name: z.string().describe("Popup name"),
  schedule: z.string().describe("When the popup happens"),
  expiresAt: z.string().optional().describe("ISO date when popup expires"),
  locationDetails: z.string().optional().describe("Location info"),
  customerInfo: z.string().optional().describe("Customer-facing info"),
  catchPreview: z.string().optional().describe("JSON: { items: [{ name, note }] }"),
  notes: z.string().optional().describe("Internal notes"),
  active: z.boolean().optional().describe("Whether popup is active"),
});
export type CreatePopupInput = z.infer<typeof CreatePopupInputSchema>;

export const UpdateMarketInputSchema = z.object({
  marketId: z.string().describe("ID of market to update"),
  name: z.string().optional().describe("New name"),
  schedule: z.string().optional().describe("New schedule"),
  locationDetails: z.string().optional().describe("New location info"),
  customerInfo: z.string().optional().describe("New customer-facing info"),
  active: z.boolean().optional().describe("Active state"),
  type: z.string().optional().describe("Market type"),
  expiresAt: z.string().optional().describe("Expiration date"),
  catchPreview: z.string().optional().describe("Catch preview JSON"),
  notes: z.string().optional().describe("Internal notes"),
});
export type UpdateMarketInput = z.infer<typeof UpdateMarketInputSchema>;

export const SendMessageInputSchema = z.object({
  conversationId: z.string().describe("ID of the conversation"),
  text: z.string().describe("Message text to send"),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

// --- Types ---

export type VoiceCommandResult = {
  intent: string;
  confidence: number;
  data: Record<string, unknown>;
  interpretation: string;
  rawTranscript: string;
  reviewType: string;
  /** For read-only tools: pre-executed query result data */
  queryResult?: Record<string, unknown>;
};

type SchemaField = {
  type: string;
  optional?: boolean;
  description?: string;
  /** Explicit JSON Schema override for tool-calling models (bypasses toJsonSchemaType). */
  jsonSchema?: Record<string, unknown>;
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
  create_order: {
    description: "Customer creates an order for pickup at a market",
    schema: {
      items: {
        type: "array of { name: string, quantity: number, unit: string }",
        description: "Items to order",
        jsonSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            },
            required: ["name", "quantity", "unit"],
          },
        },
      },
      pickupMarketId: {
        type: "string",
        description: "ID of the market for pickup",
      },
      pickupDate: {
        type: "string",
        description: "Desired pickup date (ISO format)",
      },
      customerNote: {
        type: "string",
        optional: true,
        description: "Optional note from the customer",
      },
      contactName: {
        type: "string",
        optional: true,
        description: "Customer name for the order",
      },
      contactEmail: {
        type: "string",
        optional: true,
        description: "Customer email for the order",
      },
    },
    reviewType: "order",
    roles: ["customer"],
  },
  get_order_status: {
    description:
      "Get status of an order by ID or retrieve the customer's latest order",
    schema: {
      orderId: {
        type: "string",
        optional: true,
        description: "Order ID to look up",
      },
      latest: {
        type: "boolean",
        optional: true,
        description: "If true, return the most recent order",
      },
    },
    reviewType: "read-only",
    roles: ["customer"],
  },
  update_catch: {
    description: "Update today's fresh catch with what's available",
    schema: {
      headline: { type: "string", description: "Short catchy headline" },
      items: {
        type: "array of { name: string, note: string }",
        description: "Fish items with colorful descriptions",
        jsonSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              note: { type: "string" },
            },
            required: ["name", "note"],
          },
        },
      },
      summary: { type: "string", description: "One-sentence summary" },
    },
    reviewType: "catch",
    roles: ["owner", "manager"],
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
    roles: ["owner", "manager"],
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
    roles: ["owner", "manager"],
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
    roles: ["owner", "manager"],
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
    roles: ["owner", "manager"],
  },
  send_message: {
    description: "Send a chat message in a conversation",
    schema: {
      conversationId: {
        type: "string",
        description: "ID of the conversation",
      },
      text: { type: "string", description: "Message text to send" },
    },
    reviewType: "message",
    roles: ["owner", "manager", "customer"],
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
  get_vendor_market_location: {
    description:
      "Returns a vendor's booth/location details at a specific market",
    schema: {
      vendorSlug: {
        type: "string",
        description: "Organization slug of the vendor",
      },
      marketId: {
        type: "string",
        description: "ID of the market to check",
      },
    },
    reviewType: "read-only",
    roles: ["customer", "owner", "manager"],
  },
  get_county_vendors: {
    description:
      "Returns vendors operating in a given county",
    schema: {
      county: {
        type: "string",
        description: "County name to search for vendors",
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

function filterToolsByRole(
  tools: Record<string, VoiceTool>,
  role: string,
): Record<string, VoiceTool> {
  if (role === "owner" || role === "manager") return tools;

  return Object.fromEntries(
    Object.entries(tools).filter(([, tool]) => tool.roles?.includes(role)),
  );
}

// --- Confidence scoring ---
//
// Workers-AI tool-calling returns no confidence score, so the caller (voice-command.ts)
// derives one heuristically. Combined conservatively via min() so any weak signal drags
// the score down — this is a safety net for CommandReview's low-confidence warnings.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/** True if any non-optional field (besides marketId, which is resolved separately) is missing/empty. */
function hasRequiredFieldMissing(
  tool: VoiceTool,
  data: Record<string, unknown>,
): boolean {
  return Object.entries(tool.schema).some(([field, spec]) => {
    if (spec.optional || field === "marketId") return false;

    const value = data[field];
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") {
      if (value.trim().length === 0) return true;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.length === 0;
      } catch {
        // plain string, not JSON — non-empty is enough
      }
      return false;
    }
    return false;
  });
}

/** Score how well the fuzzy-matched market's name is actually backed by the transcript. */
function marketMatchScore(
  matchedMarket: MarketContext,
  markets: MarketContext[],
  rawTranscript: string,
): number {
  const transcript = rawTranscript.toLowerCase();
  const matchedTokens = tokenize(matchedMarket.name);
  const distinctiveMatch = matchedTokens.some((t) => transcript.includes(t));
  if (!distinctiveMatch) return 0.6;

  const otherMatches = markets.some(
    (m) =>
      m.id !== matchedMarket.id &&
      tokenize(m.name).some((t) => transcript.includes(t)),
  );
  if (otherMatches) return 0.7;

  return 0.9;
}

/** Deterministic heuristic confidence score for a resolved voice command. */
export function scoreVoiceConfidence(params: {
  data: Record<string, unknown>;
  rawTranscript: string;
  matchedMarket?: MarketContext;
  markets: MarketContext[];
  tool: VoiceTool;
}): number {
  const { data, rawTranscript, matchedMarket, markets, tool } = params;

  const scores = [0.9];
  if (hasRequiredFieldMissing(tool, data)) scores.push(0.5);
  if (matchedMarket) scores.push(marketMatchScore(matchedMarket, markets, rawTranscript));

  return Math.max(0.5, Math.min(...scores));
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
 * owner/manager see all tools, other roles only see tools with matching roles[].
 */
export function mcpFormat(role: string = "owner"): McpTool[] {
  const filtered = filterToolsByRole(voiceTools, role);

  return Object.entries(filtered).map(([name, tool]) => {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [fieldName, field] of Object.entries(tool.schema)) {
      const prop: Record<string, unknown> = {
        ...(field.jsonSchema ?? toJsonSchemaType(field.type)),
      };
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
