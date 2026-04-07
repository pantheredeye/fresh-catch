import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ContentBlock,
} from "@anthropic-ai/sdk/resources/messages";

const MODEL_SONNET = "claude-sonnet-4-20250514";
const MODEL_HAIKU = "claude-haiku-4-5-20251001";
const DEFAULT_TEMPERATURE = 0.7;

export type QueryComplexity = "simple" | "complex";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ChatResult =
  | { ok: true; content: ContentBlock[]; stopReason: string | null; usage: TokenUsage }
  | { ok: false; error: string; retryable: boolean };

/**
 * Classify query complexity to route to appropriate model.
 * Simple = single-tool lookups, short factual questions.
 * Complex = multi-step, planning, ambiguous, or order-related.
 */
export function classifyQuery(message: string): QueryComplexity {
  const lower = message.toLowerCase().trim();

  // Complex indicators: multi-step planning, orders, ambiguous
  const complexPatterns = [
    /\b(help me|plan|suggest|recommend|advise)\b/,
    /\b(order|checkout|buy|purchase)\b/,
    /\b(compare|difference|versus|vs)\b/,
    /\b(dinner party|meal prep|recipe|cook)\b/,
    /\band\b.*\band\b/, // multiple "and" = multi-part request
    /\?.*\?/, // multiple questions
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(lower)) return "complex";
  }

  // Long messages are likely complex
  if (lower.split(/\s+/).length > 25) return "complex";

  return "simple";
}

/** Get model and max_tokens for a given complexity level. */
export function getModelConfig(complexity: QueryComplexity): {
  model: string;
  maxTokens: number;
} {
  if (complexity === "simple") {
    return { model: MODEL_HAIKU, maxTokens: 256 };
  }
  return { model: MODEL_SONNET, maxTokens: 512 };
}

export interface ChatOptions {
  messages: MessageParam[];
  tools?: Tool[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export function createClaudeClient(apiKey: string) {
  const client = new Anthropic({ apiKey });

  async function chat(options: ChatOptions): Promise<ChatResult> {
    try {
      const response = await client.messages.create({
        model: options.model ?? MODEL_SONNET,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        system: options.system,
        messages: options.messages,
        tools: options.tools,
      });

      return {
        ok: true,
        content: response.content,
        stopReason: response.stop_reason,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return { ok: false, error: "Rate limited by Claude API", retryable: true };
      }
      if (err instanceof Anthropic.AuthenticationError) {
        return { ok: false, error: "Invalid API key", retryable: false };
      }
      if (err instanceof Anthropic.APIConnectionError) {
        return { ok: false, error: "Network error connecting to Claude API", retryable: true };
      }
      if (err instanceof Anthropic.APIError) {
        return {
          ok: false,
          error: `Claude API error: ${err.message}`,
          retryable: err.status >= 500,
        };
      }
      return { ok: false, error: "Unknown error", retryable: false };
    }
  }

  return { chat };
}
