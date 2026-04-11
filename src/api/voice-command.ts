/**
 * Voice command endpoint: POST /api/voice/command
 * MCP-based voice processing: voice/text → transcription → Claude tool resolution.
 * Sends transcript to Claude with MCP tool definitions, returns structured VoiceCommandResult.
 */
import { env } from "cloudflare:workers";
import type { AppContext } from "@/worker";
import { db } from "@/db";
import {
  voiceTools,
  mcpFormat,
  type VoiceCommandResult,
  type BusinessContext,
} from "@/api/voice-tools";
import { toolRegistry } from "@/api/mcp-server";
import type { WorkersAiTool } from "@/ai/workers-ai-client";

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

/** Convert MCP tools to Workers AI (OpenAI-compatible) tool format. */
function toWorkersAiTools(role: string): WorkersAiTool[] {
  return mcpFormat(role).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema as WorkersAiTool["function"]["parameters"],
    },
  }));
}

export async function handleVoiceCommand(
  request: Request,
  ctx: AppContext,
): Promise<Response> {
  // Auth: require authenticated user. Org context resolved from targetOrgId or session.
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve target org + role: targetOrgId param takes priority over session org
  const reqUrl = new URL(request.url);
  const targetOrgId = reqUrl.searchParams.get("targetOrgId");

  let orgId: string;
  let role: string;

  if (targetOrgId && targetOrgId !== ctx.currentOrganization?.id) {
    // Check if user has a membership in the target org
    const membership = ctx.user.memberships?.find(
      (m) => m.organizationId === targetOrgId,
    );
    if (membership) {
      orgId = targetOrgId;
      role = membership.role;
    } else {
      // No membership = browsing customer. Verify org exists.
      const targetOrg = await db.organization.findUnique({
        where: { id: targetOrgId },
        select: { id: true },
      });
      if (!targetOrg) {
        return Response.json({ error: "Organization not found" }, { status: 404 });
      }
      orgId = targetOrgId;
      role = "customer";
    }
  } else if (ctx.currentOrganization) {
    orgId = ctx.currentOrganization.id;
    role = ctx.currentOrganization.role;
  } else {
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
  const tools = toWorkersAiTools(role);

  // Check for explicit ?marketId targeting from admin UI
  const explicitMarketId = reqUrl.searchParams.get("marketId");

  // Call Workers AI (Kimi K2.5) with tool definitions
  type AiToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
  type AiResponse = { response?: string; tool_calls?: AiToolCall[] };

  let aiResult: AiResponse;
  try {
    const ai = (env as unknown as { AI: { run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>> } }).AI;

    aiResult = (await ai.run("@cf/moonshotai/kimi-k2.5", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawTranscript },
      ],
      max_tokens: 1024,
      tools,
    })) as AiResponse;
  } catch (err) {
    console.error("Workers AI tool resolution failed:", err);
    return Response.json(
      {
        error: "MCP tool resolution failed",
        rawTranscript,
      },
      { status: 500 },
    );
  }

  // Extract tool call from response
  const toolCall = aiResult.tool_calls?.[0];

  if (!toolCall) {
    // Model didn't pick a tool — ambiguous or unrecognized input
    return Response.json({
      intent: "unknown",
      confidence: 0,
      data: {},
      interpretation:
        aiResult.response ?? "Could not determine the intended action.",
      rawTranscript,
      reviewType: "unknown",
    } satisfies VoiceCommandResult);
  }

  // Validate tool is known
  const tool = voiceTools[toolCall.function.name];
  if (!tool) {
    return Response.json({
      intent: toolCall.function.name,
      confidence: 0,
      data: {},
      interpretation: `Unknown tool "${toolCall.function.name}".`,
      rawTranscript,
      reviewType: "unknown",
    } satisfies VoiceCommandResult);
  }

  const data = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

  // For market-specific intents, verify marketId and inject _original
  if (
    toolCall.function.name === "update_market" ||
    toolCall.function.name === "update_market_catch"
  ) {
    const targetMarketId = explicitMarketId || (data.marketId as string);

    if (!targetMarketId) {
      return Response.json({
        intent: toolCall.function.name,
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
        intent: toolCall.function.name,
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

  // Build interpretation from response text
  const interpretation =
    aiResult.response ?? `Using ${toolCall.function.name}`;

  // For read-only tools, execute the query server-side and include results
  let queryResult: Record<string, unknown> | undefined;
  if (tool.reviewType === "read-only") {
    const registeredTool = toolRegistry[toolCall.function.name];
    if (registeredTool) {
      try {
        const result = await registeredTool.handler(data, orgId, role);
        if (!result.isError && result.content[0]?.text) {
          queryResult = JSON.parse(result.content[0].text);
        }
      } catch {
        // Query execution failure is non-fatal — UI will show interpretation fallback
      }
    }
  }

  // Signal: fire-and-forget voice command to Signal Agent
  try {
    const signalEnv = env as unknown as Env;
    const signalStub = signalEnv.SIGNAL_DURABLE_OBJECT.get(
      signalEnv.SIGNAL_DURABLE_OBJECT.idFromName(orgId),
    );
    signalStub.ingest({
      type: "voice", source: "command-bar", content: rawTranscript,
      intent: toolCall.function.name, role, orgId, timestamp: Date.now(),
    }).catch(() => {});
  } catch {}

  return Response.json({
    intent: toolCall.function.name,
    confidence: 1,
    data,
    interpretation,
    rawTranscript,
    reviewType: tool.reviewType,
    ...(queryResult && { queryResult }),
  } satisfies VoiceCommandResult);
}
