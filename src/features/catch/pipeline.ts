/**
 * Catch formatting pipeline: a transcript (typed or spoken) → a structured
 * draft. Ported from v1's voice-pipeline.ts + catch-record.ts, collapsed
 * into one file and scoped to catch-of-the-week only — no shared intent
 * router, no market-scoped twin (docs/audit/features.md §3B).
 */

import { runStructured, type StructuredInput } from "@/lib/ai/structure";

export interface CatchItem {
  name: string;
  note: string;
  /** LLM-extracted or admin-entered (issue #71) — omitted, not zero, when no price is known. */
  priceCents?: number;
  soldOut?: boolean;
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

const SYSTEM_PROMPT =
  'You are a seafood market assistant. Given a description of today\'s catch, output ONLY valid JSON (no markdown, no explanation) with this exact shape: { "headline": "short catchy headline", "items": [{ "name": "Fish Name", "note": "Optional detail", "priceCents": 1500 }], "summary": "One-sentence summary" }. Capitalize all fish names (e.g. "Mahi Mahi", "Red Snapper"). Use proper sentence casing for notes, headline, and summary. The note is optional: include size, cut, origin or prep ONLY if the speaker actually said it, in their words; otherwise use an empty string. Never restate or echo the fish name in the note (no "Fresh redfish"). Only include "priceCents" on an item if a price was actually said for it (e.g. "only $15 a pound" becomes 1500); omit the field entirely if no price was mentioned — do not guess or invent one.';

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
    if (item.priceCents !== undefined && typeof item.priceCents !== "number") {
      throw new Error("Invalid item shape");
    }
    if (item.soldOut !== undefined && typeof item.soldOut !== "boolean") {
      throw new Error("Invalid item shape");
    }
  }

  return content;
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

export type CatchPipelineInput = StructuredInput;

/**
 * Text input works even without the `AI` binding (C9's fallback path);
 * audio always needs Whisper, so it 501s without one.
 */
export async function runCatchPipeline(ai: Ai | undefined, input: CatchPipelineInput): Promise<CatchDraft> {
  const { data, rawTranscript } = await runStructured(ai, input, {
    systemPrompt: SYSTEM_PROMPT,
    validate: validateCatchContent,
    fallback: fallbackFormat,
  });
  return { formatted: data, rawTranscript };
}
