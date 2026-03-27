/**
 * Catch formatting endpoint: POST /api/catch/record
 * Accepts audio (Whisper transcription) or JSON text input.
 * Both paths → format via Workers AI → return formatted result (no DB save).
 */
import { env } from "cloudflare:workers";
import type { AppContext } from "@/worker";
import { hasAdminAccess } from "@/utils/permissions";

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

  const ai = (env as unknown as { AI: { run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>> } }).AI;

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
      const result = await ai.run("@cf/openai/whisper-tiny-en", {
        audio: [...new Uint8Array(body)],
      }) as { text: string };
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
  let formatted: CatchContent;
  try {
    const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content:
            "You are a seafood market assistant. Given a description of today's catch, output ONLY valid JSON (no markdown, no explanation) with this exact shape: { \"headline\": \"short catchy headline\", \"items\": [{ \"name\": \"Fish Name\", \"note\": \"Colorful description preserving the speaker's personality\" }], \"summary\": \"One-sentence summary\" }. Capitalize all fish names (e.g. \"Mahi Mahi\", \"Red Snapper\"). Use proper sentence casing for notes, headline, and summary. Preserve the speaker's colorful descriptions and personality in the notes.",
        },
        {
          role: "user",
          content: `Format this catch update into structured JSON:\n\n${transcript}`,
        },
      ],
      max_tokens: 1024,
    }) as Record<string, unknown>;

    console.log("Workers AI raw result:", JSON.stringify(result));
    // Workers AI may return { response: string } or other shapes — extract text robustly
    let rawText: string;
    if (typeof result.response === "string") {
      rawText = result.response;
    } else if (typeof result.result === "string") {
      rawText = result.result;
    } else {
      // Stringify the whole thing so we can debug + try to parse it as JSON directly
      rawText = JSON.stringify(result.response ?? result);
    }

    formatted = parseCatchContent(rawText);
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
  });
}

/**
 * Parse AI response into CatchContent, handling markdown fences.
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
