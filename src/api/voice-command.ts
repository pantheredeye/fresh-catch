/**
 * Voice command endpoint: POST /api/voice/command
 * Intent-aware voice processing using tool registry + shared voice pipeline.
 * Returns structured intent with confidence, data, and reviewType.
 */
import type { AppContext } from "@/worker";
import { db } from "@/db";
import { processVoiceInput } from "@/api/voice-pipeline";
import {
  voiceTools,
  buildCommandPrompt,
  type VoiceCommandResult,
  type BusinessContext,
} from "@/api/voice-tools";

function validateCommandResult(obj: unknown): VoiceCommandResult {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("Invalid command result shape");
  }

  const result = obj as Record<string, unknown>;

  if (typeof result.intent !== "string") {
    throw new Error("Missing or invalid intent");
  }
  if (typeof result.confidence !== "number") {
    throw new Error("Missing or invalid confidence");
  }
  if (typeof result.data !== "object" || result.data === null) {
    throw new Error("Missing or invalid data");
  }
  if (typeof result.interpretation !== "string") {
    throw new Error("Missing or invalid interpretation");
  }

  return result as unknown as VoiceCommandResult;
}

export async function handleVoiceCommand(
  request: Request,
  ctx: AppContext,
): Promise<Response> {
  // Fetch org's markets for business context
  const orgId = ctx.currentOrganization!.id;
  const markets = await db.market.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      type: true,
      schedule: true,
      active: true,
    },
  });

  const businessContext: BusinessContext = { markets };
  const role = ctx.currentOrganization!.role;
  const systemPrompt = buildCommandPrompt(voiceTools, businessContext, role);

  // Process through shared voice pipeline
  const response = await processVoiceInput(request, ctx, {
    systemPrompt,
    validate: validateCommandResult,
  });

  // If pipeline returned an error, pass through
  if (!response.ok) {
    return response;
  }

  const body = (await response.json()) as {
    formatted: VoiceCommandResult;
    rawTranscript: string;
  };

  const { formatted, rawTranscript } = body;

  // Validate intent is a known tool key
  const tool = voiceTools[formatted.intent];
  if (!tool) {
    return Response.json({
      intent: formatted.intent,
      confidence: 0,
      data: formatted.data,
      interpretation: `Unknown action "${formatted.intent}". Could not match to a known command.`,
      rawTranscript,
      reviewType: "unknown",
    } satisfies VoiceCommandResult);
  }

  // For market-specific intents, verify marketId exists in org's markets
  if (
    (formatted.intent === "update_market" ||
      formatted.intent === "update_market_catch") &&
    formatted.data.marketId
  ) {
    const marketExists = markets.some(
      (m) => m.id === formatted.data.marketId,
    );
    if (!marketExists) {
      return Response.json({
        intent: formatted.intent,
        confidence: 0,
        data: formatted.data,
        interpretation: `Market ID "${formatted.data.marketId}" not found in your markets.`,
        rawTranscript,
        reviewType: tool.reviewType,
      } satisfies VoiceCommandResult);
    }
  }

  return Response.json({
    intent: formatted.intent,
    confidence: formatted.confidence,
    data: formatted.data,
    interpretation: formatted.interpretation,
    rawTranscript,
    reviewType: tool.reviewType,
  } satisfies VoiceCommandResult);
}
