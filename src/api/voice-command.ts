/**
 * Voice command endpoint: POST /api/voice/command
 * MCP-based voice processing: voice/text → transcription → Claude tool resolution.
 * Sends transcript to Claude with MCP tool definitions, returns structured VoiceCommandResult.
 */
import { env } from "cloudflare:workers";
import Anthropic from "@anthropic-ai/sdk";
import type { AppContext } from "@/worker";
import { db } from "@/db";
import {
  voiceTools,
  mcpFormat,
  type VoiceCommandResult,
  type BusinessContext,
} from "@/api/voice-tools";

/** Transcribe audio via Whisper or extract text from JSON body. */
async function getTranscript(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { text?: string };
    if (!body.text || body.text.trim().length === 0) {
      throw new TranscriptError("No text provided", 400);
    }
    return body.text.trim();
  }

  // Audio input — transcribe with Whisper
  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    throw new TranscriptError("No audio data", 400);
  }

  const ai = (
    env as unknown as {
      AI: {
        run: (
          model: string,
          input: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>;
      };
    }
  ).AI;

  const result = (await ai.run("@cf/openai/whisper-tiny-en", {
    audio: [...new Uint8Array(body)],
  })) as { text: string };

  if (!result.text || result.text.trim().length === 0) {
    throw new TranscriptError("No speech detected in audio", 400);
  }

  return result.text.trim();
}

class TranscriptError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Build system prompt with business context for Claude tool resolution. */
function buildSystemPrompt(context: BusinessContext, role: string): string {
  const today = new Date().toISOString().split("T")[0];

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
              const preview =
                m.catchPreview.length > 200
                  ? m.catchPreview.slice(0, 200) + "..."
                  : m.catchPreview;
              parts.push(`  catchPreview: ${preview}`);
            }
            if (m.expiresAt)
              parts.push(`  expiresAt: ${new Date(m.expiresAt).toISOString()}`);
            return parts.join("\n");
          })
          .join("\n")
      : "No markets configured yet.";

  return `You are a voice command interpreter for a seafood market business.
Today's date: ${today}
User role: ${role}

## Existing Markets

${marketList}

## Instructions

Given the user's voice input, choose the most appropriate tool and extract parameters.

Rules:
- Match market names fuzzily to existing markets and use their ID
- If the event sounds temporary or one-time, use create_popup (not create_market)
- Resolve relative dates ("this Saturday", "tomorrow") to absolute dates using today's date
- For update_market: ONLY include fields the user explicitly wants to change
- If multiple markets partially match, pick the best match
- If you cannot determine the intent, do not use any tool — respond with text explaining why`;
}

/** Convert MCP tools to Anthropic SDK tool format. */
function toAnthropicTools(
  role: string,
): Anthropic.Messages.Tool[] {
  return mcpFormat(role).map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Messages.Tool["input_schema"],
  }));
}

export async function handleVoiceCommand(
  request: Request,
  ctx: AppContext,
): Promise<Response> {
  // Auth checks — any authenticated user with an org context can use voice commands.
  // Tool scoping is handled by role-based filtering in voice-tools.ts.
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.currentOrganization) {
    return Response.json({ error: "No organization context" }, { status: 403 });
  }

  // Transcribe (Whisper for audio, passthrough for text)
  let rawTranscript: string;
  try {
    rawTranscript = await getTranscript(request);
  } catch (err) {
    if (err instanceof TranscriptError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("Transcription failed:", err);
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }

  // Fetch org's markets for business context
  const orgId = ctx.currentOrganization.id;
  const role = ctx.currentOrganization.role;
  const markets = await db.market.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      type: true,
      schedule: true,
      active: true,
      subtitle: true,
      locationDetails: true,
      customerInfo: true,
      catchPreview: true,
      expiresAt: true,
    },
  });

  const businessContext: BusinessContext = { markets };
  const systemPrompt = buildSystemPrompt(businessContext, role);
  const tools = toAnthropicTools(role);

  // Check for explicit ?marketId targeting from admin UI
  const url = new URL(request.url);
  const explicitMarketId = url.searchParams.get("marketId");

  // Call Claude with MCP tool definitions
  let response: Anthropic.Messages.Message;
  try {
    const client = new Anthropic({
      apiKey: (env as unknown as { ANTHROPIC_API_KEY: string }).ANTHROPIC_API_KEY,
    });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: [{ role: "user", content: rawTranscript }],
    });
  } catch (err) {
    console.error("Claude MCP resolution failed:", err);
    return Response.json(
      {
        error: "MCP tool resolution failed",
        rawTranscript,
      },
      { status: 500 },
    );
  }

  // Extract tool use from response
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUseBlock) {
    // Claude didn't pick a tool — ambiguous or unrecognized input
    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    );
    return Response.json({
      intent: "unknown",
      confidence: 0,
      data: {},
      interpretation:
        textBlock?.text ?? "Could not determine the intended action.",
      rawTranscript,
      reviewType: "unknown",
    } satisfies VoiceCommandResult);
  }

  // Validate tool is known
  const tool = voiceTools[toolUseBlock.name];
  if (!tool) {
    return Response.json({
      intent: toolUseBlock.name,
      confidence: 0,
      data: toolUseBlock.input as Record<string, unknown>,
      interpretation: `Unknown tool "${toolUseBlock.name}".`,
      rawTranscript,
      reviewType: "unknown",
    } satisfies VoiceCommandResult);
  }

  const data = toolUseBlock.input as Record<string, unknown>;

  // For market-specific intents, verify marketId and inject _original
  if (
    toolUseBlock.name === "update_market" ||
    toolUseBlock.name === "update_market_catch"
  ) {
    const targetMarketId = explicitMarketId || (data.marketId as string);

    if (!targetMarketId) {
      return Response.json({
        intent: toolUseBlock.name,
        confidence: 0,
        data,
        interpretation: "Could not determine which market to update.",
        rawTranscript,
        reviewType: tool.reviewType,
      } satisfies VoiceCommandResult);
    }

    const matchedMarket = markets.find((m) => m.id === targetMarketId);
    if (!matchedMarket) {
      return Response.json({
        intent: toolUseBlock.name,
        confidence: 0,
        data,
        interpretation: `Market ID "${targetMarketId}" not found in your markets.`,
        rawTranscript,
        reviewType: tool.reviewType,
      } satisfies VoiceCommandResult);
    }

    // Inject original market state for diff display + override marketId if explicit
    data.marketId = matchedMarket.id;
    data._original = {
      name: matchedMarket.name,
      schedule: matchedMarket.schedule,
      subtitle: matchedMarket.subtitle,
      locationDetails: matchedMarket.locationDetails,
      customerInfo: matchedMarket.customerInfo,
      catchPreview: matchedMarket.catchPreview,
      active: matchedMarket.active,
      type: matchedMarket.type,
      expiresAt: matchedMarket.expiresAt,
    };
  }

  // Build interpretation from any text block Claude included
  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text",
  );
  const interpretation =
    textBlock?.text ?? `Using ${toolUseBlock.name}`;

  return Response.json({
    intent: toolUseBlock.name,
    confidence: 1,
    data,
    interpretation,
    rawTranscript,
    reviewType: tool.reviewType,
  } satisfies VoiceCommandResult);
}
