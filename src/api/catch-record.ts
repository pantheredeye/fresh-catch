/**
 * Catch formatting endpoint: POST /api/catch/record
 * Accepts audio (Whisper transcription) or JSON text input.
 * Both paths → format via Workers AI → return formatted result (no DB save).
 */
import type { AppContext } from "@/worker";
import { processVoiceInput } from "@/api/voice-pipeline";

interface CatchContent {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
}

const CATCH_SYSTEM_PROMPT =
  'You are a seafood market assistant. Given a description of today\'s catch, output ONLY valid JSON (no markdown, no explanation) with this exact shape: { "headline": "short catchy headline", "items": [{ "name": "Fish Name", "note": "Colorful description preserving the speaker\'s personality" }], "summary": "One-sentence summary" }. Capitalize all fish names (e.g. "Mahi Mahi", "Red Snapper"). Use proper sentence casing for notes, headline, and summary. Preserve the speaker\'s colorful descriptions and personality in the notes.';

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

export async function handleCatchRecord(
  request: Request,
  ctx: AppContext,
): Promise<Response> {
  return processVoiceInput(request, ctx, {
    systemPrompt: CATCH_SYSTEM_PROMPT,
    validate: validateCatchContent,
  });
}
