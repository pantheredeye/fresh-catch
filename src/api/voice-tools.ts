/**
 * Voice tool registry + buildCommandPrompt.
 * Defines all voice actions and generates LLM system prompts.
 * Phase 1: prompt generation. Phase 3: becomes Agents SDK tool definitions.
 */

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
};

// --- Business context type ---

export type MarketContext = {
  id: string;
  name: string;
  type: string;
  schedule: string;
  active: boolean;
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
          .map(
            (m) =>
              `- ${m.name} (id: ${m.id}, type: ${m.type}, schedule: ${m.schedule}, active: ${m.active})`,
          )
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
- If you cannot determine the intent, use confidence: 0 and interpretation explaining why`;
}
