/**
 * Generic "text/audio → Whisper → LLM → validated JSON" plumbing. Features
 * supply the prompt, validator and an optional no-AI fallback; this file
 * knows nothing about any of them (see guardrails.test.ts).
 */

export type StructuredInput = { kind: "text"; text: string } | { kind: "audio"; audio: ArrayBuffer };

export class StructuredPipelineError extends Error {
  readonly status: number;
  readonly rawTranscript?: string;

  constructor(message: string, options: { status?: number; rawTranscript?: string } = {}) {
    super(message);
    this.status = options.status ?? 500;
    this.rawTranscript = options.rawTranscript;
  }
}

export interface StructureOptions<T> {
  systemPrompt: string;
  /** Throws on a bad shape; plain TS, no Zod. */
  validate: (obj: unknown) => T;
  /** Used for text input when `ai` is undefined. */
  fallback?: (transcript: string) => T;
  /** Default "@cf/meta/llama-3.3-70b-instruct-fp8-fast". */
  model?: string;
  /** Default 1024. */
  maxTokens?: number;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_MAX_TOKENS = 2048;
const WHISPER_MODEL = "@cf/openai/whisper-tiny-en";

async function transcribeAudio(ai: Ai, audio: ArrayBuffer): Promise<string> {
  let result: { text: string };
  try {
    result = (await ai.run(WHISPER_MODEL, {
      audio: [...new Uint8Array(audio)],
    })) as { text: string };
  } catch (error) {
    console.error("Whisper transcription failed:", error);
    throw new StructuredPipelineError("Transcription failed");
  }

  const transcript = result.text?.trim();
  if (!transcript) throw new StructuredPipelineError("No speech detected in audio", { status: 400 });
  return transcript;
}

async function callModel(ai: Ai, transcript: string, options: StructureOptions<unknown>): Promise<string> {
  let result: Record<string, unknown>;
  try {
    result = (await ai.run(options.model ?? DEFAULT_MODEL, {
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: `Format this input into structured JSON:\n\n${transcript}` },
      ],
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    })) as Record<string, unknown>;
  } catch (error) {
    console.error("AI formatting failed:", error);
    throw new StructuredPipelineError("Formatting failed", { rawTranscript: transcript });
  }

  return typeof result.response === "string"
    ? result.response
    : typeof result.result === "string"
      ? result.result
      : JSON.stringify(result.response ?? result);
}

/** Handles a bare JSON object, one wrapped in a markdown code fence, or one surrounded by prose. */
function parseStructuredJson<T>(raw: string, validate: (obj: unknown) => T): T {
  try {
    return validate(JSON.parse(raw));
  } catch {
    // fall through to the fenced-code-block variant
  }
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "");
  try {
    return validate(JSON.parse(stripped));
  } catch {
    // fall through to the outermost-braces variant ("Here is the JSON: {…}")
  }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last <= first) throw new Error("No JSON object in response");
  return validate(JSON.parse(raw.slice(first, last + 1)));
}

/**
 * Text input works without the `AI` binding when a `fallback` is given;
 * audio always needs Whisper, so it 501s without one.
 */
export async function runStructured<T>(
  ai: Ai | undefined,
  input: StructuredInput,
  options: StructureOptions<T>,
): Promise<{ data: T; rawTranscript: string }> {
  let transcript: string;
  if (input.kind === "text") {
    transcript = input.text.trim();
    if (!transcript) throw new StructuredPipelineError("No text provided", { status: 400 });
  } else {
    if (!ai) throw new StructuredPipelineError("Audio transcription requires the AI binding", { status: 501 });
    transcript = await transcribeAudio(ai, input.audio);
  }

  if (!ai) {
    if (!options.fallback) {
      throw new StructuredPipelineError("Structuring requires the AI binding", {
        status: 501,
        rawTranscript: transcript,
      });
    }
    return { data: options.fallback(transcript), rawTranscript: transcript };
  }

  const raw = await callModel(ai, transcript, options);
  try {
    return { data: parseStructuredJson(raw, options.validate), rawTranscript: transcript };
  } catch (error) {
    // Workers Logs is the only place to see what the model actually said when a live submission fails.
    console.error("AI response failed to parse/validate:", error, "— raw output:", raw.slice(0, 2000));
    throw new StructuredPipelineError("Failed to parse AI response into expected shape", {
      rawTranscript: transcript,
    });
  }
}
