/**
 * AI agent for customer chat — calls Workers AI (Kimi K2.5) with tool use.
 * Takes customer message + history + org context, returns AI response text.
 */

import {
  chat,
  classifyQuery,
  getModelConfig,
  type ChatMessage,
  type WorkersAiTool,
  type ToolCall,
  type TokenUsage,
  type QueryComplexity,
} from "@/ai/workers-ai-client";
import { voiceTools } from "@/api/voice-tools";
import {
  handleListCatch,
  handleGetMarkets,
  handleGetVendorPopups,
  handleGetMarketVendors,
  handleCreateOrder,
} from "@/api/tool-handlers";

// --- Types ---

export interface OrgContext {
  organizationId: string;
  orgName: string;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface AiAgentOptions {
  customerMessage: string;
  conversationHistory: ChatMessage[];
  orgContext: OrgContext;
}

export type GapReason = "no_tool" | "insufficient_data" | "model_uncertain" | "api_error" | "max_rounds";

export type AiAgentResult =
  | { ok: true; text: string; usage: TokenUsage; complexity: QueryComplexity; model: string }
  | { ok: false; text: string; error: string; gapReason: GapReason };

// Max tool-use rounds to prevent infinite loops
const MAX_TOOL_ROUNDS = 5;

const FALLBACK_MESSAGE = "Sorry, I'm having trouble right now. A team member will get back to you shortly!";

// --- Tool conversion ---

/** Map tool names to their handler functions */
const toolHandlers: Record<string, (rawInput: unknown, orgId: string, callerRole?: string) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>> = {
  list_catch: handleListCatch,
  get_markets: handleGetMarkets,
  get_vendor_popups: handleGetVendorPopups,
  get_market_vendors: handleGetMarketVendors,
  create_order: handleCreateOrder,
};

/** Convert customer-accessible voiceTools to Workers AI tool format */
function buildTools(): WorkersAiTool[] {
  const customerTools = Object.entries(voiceTools).filter(
    ([, tool]) => tool.roles?.includes("customer"),
  );

  return customerTools.map(([name, tool]) => {
    const properties: Record<string, { type: string; description?: string }> = {};
    const required: string[] = [];

    for (const [fieldName, field] of Object.entries(tool.schema)) {
      const prop: { type: string; description?: string } = { type: "string" };
      if (field.type === "boolean") prop.type = "boolean";
      if (field.type === "number" || field.type === "integer") prop.type = "number";
      if (field.description) prop.description = field.description;
      properties[fieldName] = prop;
      if (!field.optional) required.push(fieldName);
    }

    return {
      type: "function" as const,
      function: {
        name,
        description: tool.description,
        parameters: {
          type: "object" as const,
          properties,
          ...(required.length > 0 ? { required } : {}),
        },
      },
    };
  });
}

// --- System prompt ---

function buildSystemPrompt(orgName: string, customerName?: string | null, customerEmail?: string | null): string {
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
- Help customers place orders for pickup at a market

## Ordering — IMPORTANT
When a customer wants to place an order, you MUST follow this confirmation flow:
1. **Propose the order first** — summarize what they want (items, quantities, pickup market, pickup date) and ask for confirmation. Example: "I can set aside 4 lbs Mahi for pickup Saturday at Adobe Ranch. Want me to place that order?"
2. **Wait for explicit confirmation** — only call create_order after the customer says "yes", "confirm", "place it", or similar affirmative.
3. **If they say no or want changes** — adjust the proposal and ask again. Never execute create_order without confirmation.
4. **After placing** — confirm with a friendly message like "Done! Order placed — the vendor will confirm shortly."

NEVER call create_order without the customer explicitly confirming the proposed order. If you're unsure about any detail (which market, what date, quantities), ask before proposing.

## Guidelines
- Always check the current catch data before answering "what's fresh" questions
- When listing items, include the vendor's own notes/descriptions
- If no catch data is available, let the customer know and suggest checking back
- Keep responses concise — customers want quick answers
- Reference specific market names and schedules when relevant
- You're chatting with a customer, keep it conversational${
    customerName || customerEmail
      ? `

## Current Customer
${customerName ? `- Name: ${customerName}` : ""}${customerEmail ? `\n- Email: ${customerEmail}` : ""}
When placing orders, automatically include the customer's name and email as contactName and contactEmail in the create_order tool call.`
      : ""
  }`;
}

// --- Agent core ---

/**
 * Generate an AI response for a customer chat message.
 * Handles the full tool-use loop: model may call tools, we execute them
 * and feed results back until model produces a final text response.
 */
export async function generateAiResponse(options: AiAgentOptions): Promise<AiAgentResult> {
  const { customerMessage, conversationHistory, orgContext } = options;

  const tools = buildTools();
  const system = buildSystemPrompt(orgContext.orgName, orgContext.customerName, orgContext.customerEmail);

  // Classify query complexity for model routing
  const complexity = classifyQuery(customerMessage);
  const modelConfig = getModelConfig(complexity);

  // Build messages: history + latest customer message
  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: customerMessage },
  ];

  let round = 0;
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  while (round < MAX_TOOL_ROUNDS) {
    const result = await chat({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      system,
      model: modelConfig.model,
      maxTokens: modelConfig.maxTokens,
    });

    if (!result.ok) {
      return {
        ok: false,
        text: FALLBACK_MESSAGE,
        error: result.error,
        gapReason: "api_error",
      };
    }

    totalUsage.inputTokens += result.usage.inputTokens;
    totalUsage.outputTokens += result.usage.outputTokens;

    // If no tool calls, we have the final text response
    if (result.toolCalls.length === 0) {
      return {
        ok: true,
        text: result.content || FALLBACK_MESSAGE,
        usage: totalUsage,
        complexity,
        model: modelConfig.model,
      };
    }

    // Model wants to use tools — add assistant message with tool calls
    messages.push({
      role: "assistant",
      content: result.content || undefined,
      tool_calls: result.toolCalls,
    });

    // Execute each tool call and feed results back
    const toolResults = await Promise.all(
      result.toolCalls.map(async (toolCall: ToolCall) => {
        const handler = toolHandlers[toolCall.function.name];

        if (!handler) {
          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: `Unknown tool: ${toolCall.function.name}`,
          };
        }

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const handlerResult = await handler(args, orgContext.organizationId, "customer");
          const text = handlerResult.content.map((c) => c.text).join("\n");

          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: handlerResult.isError ? `Error: ${text}` : text,
          };
        } catch (err) {
          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }),
    );

    // Add tool results as individual messages
    for (const toolResult of toolResults) {
      messages.push(toolResult);
    }

    round++;
  }

  // Exhausted tool rounds
  return {
    ok: false,
    text: FALLBACK_MESSAGE,
    error: `Exceeded max tool rounds (${MAX_TOOL_ROUNDS})`,
    gapReason: "max_rounds",
  };
}
