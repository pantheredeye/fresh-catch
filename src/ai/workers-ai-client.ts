/**
 * Workers AI client for text generation with tool calling.
 * Replaces Anthropic SDK — uses Kimi K2.5 for tool use, Llama 3.3 for simple queries.
 */
import { env } from "cloudflare:workers";

const MODEL_KIMI = "@cf/moonshotai/kimi-k2.5";
const MODEL_LLAMA = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_TEMPERATURE = 0.7;

export type QueryComplexity = "simple" | "complex";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** OpenAI-compatible tool definition for Workers AI */
export type WorkersAiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: {
      type: "object";
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
};

/** Tool call returned by Workers AI */
export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatResult =
  | { ok: true; content: string; toolCalls: ToolCall[]; usage: TokenUsage }
  | { ok: false; error: string; retryable: boolean };

/**
 * Classify query complexity to route to appropriate model.
 * Simple = single-tool lookups, short factual questions → Llama (no tools).
 * Complex = multi-step, planning, ambiguous, or order-related → Kimi (with tools).
 */
export function classifyQuery(message: string): QueryComplexity {
  const lower = message.toLowerCase().trim();

  const complexPatterns = [
    /\b(help me|plan|suggest|recommend|advise)\b/,
    /\b(order|checkout|buy|purchase)\b/,
    /\b(compare|difference|versus|vs)\b/,
    /\b(dinner party|meal prep|recipe|cook)\b/,
    /\band\b.*\band\b/,
    /\?.*\?/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(lower)) return "complex";
  }

  if (lower.split(/\s+/).length > 25) return "complex";

  return "simple";
}

/** Get model and max_tokens for a given complexity level. */
export function getModelConfig(complexity: QueryComplexity): {
  model: string;
  maxTokens: number;
} {
  if (complexity === "simple") {
    return { model: MODEL_LLAMA, maxTokens: 256 };
  }
  return { model: MODEL_KIMI, maxTokens: 1024 };
}

export interface ChatOptions {
  messages: ChatMessage[];
  tools?: WorkersAiTool[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

type WorkersAiResponse = {
  response?: string;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const model = options.model ?? MODEL_KIMI;

  // Prepend system message if provided
  const messages: ChatMessage[] = options.system
    ? [{ role: "system", content: options.system }, ...options.messages]
    : [...options.messages];

  const ai = (env as unknown as { AI: { run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>> } }).AI;

  try {
    const input: Record<string, unknown> = {
      messages,
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    };

    if (options.tools && options.tools.length > 0) {
      input.tools = options.tools;
    }

    const result = (await ai.run(model, input)) as WorkersAiResponse;

    const usage: TokenUsage = {
      inputTokens: result.usage?.prompt_tokens ?? 0,
      outputTokens: result.usage?.completion_tokens ?? 0,
    };

    return {
      ok: true,
      content: result.response ?? "",
      toolCalls: result.tool_calls ?? [],
      usage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Workers AI error: ${message}`,
      retryable: true,
    };
  }
}
