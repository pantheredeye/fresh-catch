/**
 * Audio processing endpoint: POST /api/catch/record
 * Receives audio → transcribes via Whisper → formats via Claude → saves to DB.
 */
import { env } from "cloudflare:workers";
import type { AppContext } from "@/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { db } from "@/db";

interface CatchContent {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
}

export async function handleCatchRecord(
  request: Request,
  ctx: AppContext,
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

  const organizationId = ctx.currentOrganization.id;

  // Read audio from request body
  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return Response.json({ error: "No audio data" }, { status: 400 });
  }

  // Step 1: Transcribe with Whisper
  let transcript: string;
  try {
    const ai = (env as unknown as { AI: { run: (model: string, input: Record<string, unknown>) => Promise<{ text: string }> } }).AI;
    const result = await ai.run("@cf/openai/whisper-tiny-en", {
      audio: [...new Uint8Array(body)],
    });
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

  // Step 2: Format with Claude
  const apiKey = (env as unknown as Record<string, string>).ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return Response.json(
      { error: "AI formatting not configured" },
      { status: 500 },
    );
  }

  let formatted: CatchContent;
  try {
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20241022",
          max_tokens: 1024,
          system:
            "You are a seafood market assistant. Given a voice transcript of a fisherman describing today's catch, output ONLY valid JSON (no markdown, no explanation) with this exact shape: { \"headline\": \"short catchy headline\", \"items\": [{ \"name\": \"fish name\", \"note\": \"colorful description preserving the speaker's personality\" }], \"summary\": \"one-sentence summary\" }. Preserve the speaker's colorful descriptions and personality in the notes.",
          messages: [
            {
              role: "user",
              content: `Format this catch update transcript into structured JSON:\n\n${transcript}`,
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      throw new Error(`Claude API returned ${claudeResponse.status}`);
    }

    const claudeResult = (await claudeResponse.json()) as {
      content: { type: string; text: string }[];
    };
    const rawText = claudeResult.content[0]?.text ?? "";

    formatted = parseCatchContent(rawText);
  } catch (error) {
    console.error("Claude formatting failed:", error);
    return Response.json(
      {
        error: "Formatting failed",
        rawTranscript: transcript,
      },
      { status: 500 },
    );
  }

  // Step 3: Archive existing live updates, save new one
  await db.catchUpdate.updateMany({
    where: { organizationId, status: "live" },
    data: { status: "archived" },
  });

  const catchUpdate = await db.catchUpdate.create({
    data: {
      organizationId,
      recordedBy: ctx.user.id,
      rawTranscript: transcript,
      formattedContent: JSON.stringify(formatted),
      status: "live",
    },
  });

  return Response.json({
    id: catchUpdate.id,
    formatted,
    rawTranscript: transcript,
  });
}

/**
 * Parse Claude's response into CatchContent, handling markdown fences.
 */
function parseCatchContent(raw: string): CatchContent {
  // Try direct parse
  try {
    return validateCatchContent(JSON.parse(raw));
  } catch {
    // noop
  }

  // Strip markdown code fences and retry
  const stripped = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  try {
    return validateCatchContent(JSON.parse(stripped));
  } catch {
    // noop
  }

  throw new Error("Failed to parse catch content from Claude response");
}

function validateCatchContent(obj: unknown): CatchContent {
  if (
    typeof obj !== "object" ||
    obj === null ||
    typeof (obj as CatchContent).headline !== "string" ||
    !Array.isArray((obj as CatchContent).items) ||
    typeof (obj as CatchContent).summary !== "string"
  ) {
    throw new Error("Invalid catch content shape");
  }

  const content = obj as CatchContent;
  for (const item of content.items) {
    if (typeof item.name !== "string" || typeof item.note !== "string") {
      throw new Error("Invalid item shape");
    }
  }

  return content;
}
