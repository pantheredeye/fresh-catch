import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ContentBlock,
} from "@anthropic-ai/sdk/resources/messages";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

export type ChatResult =
  | { ok: true; content: ContentBlock[]; stopReason: string | null }
  | { ok: false; error: string; retryable: boolean };

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
        model: options.model ?? DEFAULT_MODEL,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        system: options.system,
        messages: options.messages,
        tools: options.tools,
      });

      return {
        ok: true,
        content: response.content,
        stopReason: response.stop_reason,
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
