/**
 * Shared server-side voice processing pipeline.
 * Accepts audio (Whisper transcription) or JSON text input,
 * formats via Workers AI, and returns structured result.
 */
import { env } from "cloudflare:workers";
import type { AppContext } from "@/worker";
import { hasAdminAccess } from "@/utils/permissions";

export interface VoicePipelineOptions<T> {
  systemPrompt: string;
  validate: (obj: unknown) => T;
}

export interface VoicePipelineResult<T> {
  formatted: T;
  rawTranscript: string;
}

export async function processVoiceInput<T>(
  request: Request,
  ctx: AppContext,
  options: VoicePipelineOptions<T>,
): Promise<Response> {
  // Auth checks
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(ctx)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.currentOrganization) {
    return Response.json({ error: "No organization context" }, { status: 403 });
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

  // Determine input type: JSON text or audio
  const contentType = request.headers.get("content-type") ?? "";
  let transcript: string;

  if (contentType.includes("application/json")) {
    // Text input — use directly
    const body = (await request.json()) as { text?: string };
    if (!body.text || body.text.trim().length === 0) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }
    transcript = body.text.trim();
  } else {
    // Audio input — transcribe with Whisper
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return Response.json({ error: "No audio data" }, { status: 400 });
    }

    try {
      const result = (await ai.run("@cf/openai/whisper-tiny-en", {
        audio: [...new Uint8Array(body)],
      })) as { text: string };
      transcript = result.text;
    } catch (error) {
      console.error("Whisper transcription failed:", error);
      return Response.json(
        { error: "Transcription failed" },
        { status: 500 },
      );
    }

    if (!transcript || transcript.trim().length === 0) {
      return Response.json(
        { error: "No speech detected in audio" },
        { status: 400 },
      );
    }
  }

  // Format with Workers AI
  let formatted: T;
  try {
    const result = (await ai.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: [
          { role: "system", content: options.systemPrompt },
          {
            role: "user",
            content: `Format this input into structured JSON:\n\n${transcript}`,
          },
        ],
        max_tokens: 1024,
      },
    )) as Record<string, unknown>;

    // Workers AI may return { response: string } or other shapes
    let rawText: string;
    if (typeof result.response === "string") {
      rawText = result.response;
    } else if (typeof result.result === "string") {
      rawText = result.result;
    } else {
      rawText = JSON.stringify(result.response ?? result);
    }

    formatted = parseAIResponse(rawText, options.validate);
  } catch (error) {
    console.error("AI formatting failed:", error);
    return Response.json(
      {
        error: "Formatting failed",
        rawTranscript: transcript,
      },
      { status: 500 },
    );
  }

  return Response.json({
    formatted,
    rawTranscript: transcript,
  } satisfies VoicePipelineResult<T>);
}

/**
 * Parse AI response, handling markdown fences, then validate shape.
 */
function parseAIResponse<T>(raw: string, validate: (obj: unknown) => T): T {
  // Try direct parse
  try {
    return validate(JSON.parse(raw));
  } catch {
    // noop
  }

  // Strip markdown code fences and retry
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "");
  try {
    return validate(JSON.parse(stripped));
  } catch {
    // noop
  }

  throw new Error("Failed to parse AI response into expected shape");
}
