/**
 * AI agent for customer chat — calls Claude API with tool use.
 * Takes customer message + history + org context, returns AI response text.
 */

import type { MessageParam, Tool, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { createClaudeClient, classifyQuery, getModelConfig } from "./claude-client";
import type { TokenUsage, QueryComplexity } from "./claude-client";
import { voiceTools } from "@/api/voice-tools";
import {
  handleListCatch,
  handleGetMarkets,
  handleGetVendorPopups,
  handleGetMarketVendors,
} from "@/api/tool-handlers";

// --- Types ---

export interface OrgContext {
  organizationId: string;
  orgName: string;
}

export interface AiAgentOptions {
  apiKey: string;
  customerMessage: string;
  conversationHistory: MessageParam[];
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
const toolHandlers: Record<string, (rawInput: unknown, orgId: string) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>> = {
  list_catch: handleListCatch,
  get_markets: handleGetMarkets,
  get_vendor_popups: handleGetVendorPopups,
  get_market_vendors: handleGetMarketVendors,
};

/** Convert customer-accessible voiceTools to Anthropic Tool[] format */
function buildClaudeTools(): Tool[] {
  const customerTools = Object.entries(voiceTools).filter(
    ([, tool]) => tool.roles?.includes("customer"),
  );

  return customerTools.map(([name, tool]) => {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const [fieldName, field] of Object.entries(tool.schema)) {
      const prop: Record<string, unknown> = { type: "string" };
      if (field.type === "boolean") prop.type = "boolean";
      if (field.type === "number" || field.type === "integer") prop.type = "number";
      if (field.description) prop.description = field.description;
      properties[fieldName] = prop;
      if (!field.optional) required.push(fieldName);
    }

    return {
      name,
      description: tool.description,
      input_schema: {
        type: "object" as const,
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    };
  });
}

// --- System prompt ---

function buildSystemPrompt(orgName: string): string {
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
- Reference specific market names and schedules when relevant
- You're chatting with a customer, keep it conversational`;
}

// --- Agent core ---

/**
 * Generate an AI response for a customer chat message.
 * Handles the full tool-use loop: Claude may call tools, we execute them
 * and feed results back until Claude produces a final text response.
 */
export async function generateAiResponse(options: AiAgentOptions): Promise<AiAgentResult> {
  const { apiKey, customerMessage, conversationHistory, orgContext } = options;

  const client = createClaudeClient(apiKey);
  const tools = buildClaudeTools();
  const system = buildSystemPrompt(orgContext.orgName);

  // Classify query complexity for model routing
  const complexity = classifyQuery(customerMessage);
  const modelConfig = getModelConfig(complexity);

  // Build messages: history + latest customer message
  const messages: MessageParam[] = [
    ...conversationHistory,
    { role: "user", content: customerMessage },
  ];

  let round = 0;
  // Accumulate token usage across tool-use rounds
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  while (round < MAX_TOOL_ROUNDS) {
    const result = await client.chat({
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

    // If Claude stopped with end_turn or no tool use, extract text and return
    if (result.stopReason !== "tool_use") {
      const text = result.content
        .filter((block) => block.type === "text")
        .map((block) => "text" in block ? block.text : "")
        .join("\n");

      return {
        ok: true,
        text: text || FALLBACK_MESSAGE,
        usage: totalUsage,
        complexity,
        model: modelConfig.model,
      };
    }

    // Claude wants to use tools — execute them and feed results back
    const toolUseBlocks = result.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use",
    );

    // Add assistant's response (with tool_use blocks) to messages
    messages.push({ role: "assistant", content: result.content });

    // Execute each tool call and collect results
    const toolResults: ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const handler = toolHandlers[toolUse.name];

        if (!handler) {
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: `Unknown tool: ${toolUse.name}`,
            is_error: true,
          };
        }

        try {
          const handlerResult = await handler(toolUse.input, orgContext.organizationId);
          const text = handlerResult.content.map((c) => c.text).join("\n");

          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: text,
            is_error: handlerResult.isError ?? false,
          };
        } catch (err) {
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          };
        }
      }),
    );

    // Add tool results as a user message
    messages.push({ role: "user", content: toolResults });

    round++;
  }

  // Exhausted tool rounds — return what we have
  return {
    ok: false,
    text: FALLBACK_MESSAGE,
    error: `Exceeded max tool rounds (${MAX_TOOL_ROUNDS})`,
    gapReason: "max_rounds",
  };
}
