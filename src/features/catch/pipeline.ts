/**
 * Catch formatting pipeline: a transcript (typed or spoken) → a structured
 * draft. Ported from v1's voice-pipeline.ts + catch-record.ts, collapsed
 * into one file and scoped to catch-of-the-week only — no shared intent
 * router, no market-scoped twin (docs/audit/features.md §3B).
 */

export interface CatchItem {
  name: string;
  note: string;
}

export interface CatchContent {
  headline: string;
  items: CatchItem[];
  summary: string;
}

export interface CatchDraft {
  formatted: CatchContent;
  rawTranscript: string;
}

export class CatchPipelineError extends Error {
  readonly status: number;
  readonly rawTranscript?: string;

  constructor(message: string, options: { status?: number; rawTranscript?: string } = {}) {
    super(message);
    this.status = options.status ?? 500;
    this.rawTranscript = options.rawTranscript;
  }
}

const SYSTEM_PROMPT =
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

/** Handles a bare JSON object or one wrapped in a markdown code fence. */
function parseAiJson(raw: string): CatchContent {
  try {
    return validateCatchContent(JSON.parse(raw));
  } catch {
    // fall through to the fenced-code-block variant
  }
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "");
  return validateCatchContent(JSON.parse(stripped));
}

/** Parses a stored `CatchUpdate.formattedContent` JSON string, or null if it's unreadable. */
export function parseCatchContent(json: string): CatchContent | null {
  try {
    return validateCatchContent(JSON.parse(json));
  } catch {
    return null;
  }
}

/**
 * No `AI` binding (C9: no local emulation) — a deterministic, non-AI draft
 * so text input still works in local dev and in tests. One line per item,
 * optionally "Name — note" or "Name - note".
 */
function fallbackFormat(text: string): CatchContent {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const source = lines.length ? lines : [text.trim()];
  const items: CatchItem[] = source.map((line) => {
    const match = line.match(/^(.+?)\s*[—-]\s*(.+)$/);
    return match ? { name: match[1].trim(), note: match[2].trim() } : { name: line, note: "" };
  });
  const summary = text.length > 140 ? `${text.slice(0, 137).trim()}...` : text.trim();
  return { headline: "Today's Catch", items, summary };
}

async function formatTranscript(ai: Ai, transcript: string): Promise<CatchContent> {
  let result: Record<string, unknown>;
  try {
    result = (await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Format this input into structured JSON:\n\n${transcript}` },
      ],
      max_tokens: 1024,
    })) as Record<string, unknown>;
  } catch (error) {
    console.error("AI formatting failed:", error);
    throw new CatchPipelineError("Formatting failed", { rawTranscript: transcript });
  }

  const rawText =
    typeof result.response === "string"
      ? result.response
      : typeof result.result === "string"
        ? result.result
        : JSON.stringify(result.response ?? result);

  try {
    return parseAiJson(rawText);
  } catch {
    throw new CatchPipelineError("Failed to parse AI response into expected shape", { rawTranscript: transcript });
  }
}

async function transcribeAudio(ai: Ai, audio: ArrayBuffer): Promise<string> {
  let result: { text: string };
  try {
    result = (await ai.run("@cf/openai/whisper-tiny-en", {
      audio: [...new Uint8Array(audio)],
    })) as { text: string };
  } catch (error) {
    console.error("Whisper transcription failed:", error);
    throw new CatchPipelineError("Transcription failed");
  }

  const transcript = result.text?.trim();
  if (!transcript) throw new CatchPipelineError("No speech detected in audio", { status: 400 });
  return transcript;
}

export type CatchPipelineInput = { kind: "text"; text: string } | { kind: "audio"; audio: ArrayBuffer };

/**
 * Text input works even without the `AI` binding (C9's fallback path);
 * audio always needs Whisper, so it 501s without one.
 */
export async function runCatchPipeline(ai: Ai | undefined, input: CatchPipelineInput): Promise<CatchDraft> {
  let transcript: string;
  if (input.kind === "text") {
    transcript = input.text.trim();
    if (!transcript) throw new CatchPipelineError("No text provided", { status: 400 });
  } else {
    if (!ai) throw new CatchPipelineError("Audio transcription requires the AI binding", { status: 501 });
    transcript = await transcribeAudio(ai, input.audio);
  }

  if (!ai) {
    return { formatted: fallbackFormat(transcript), rawTranscript: transcript };
  }

  const formatted = await formatTranscript(ai, transcript);
  return { formatted, rawTranscript: transcript };
}
