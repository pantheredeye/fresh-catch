import { describe, expect, it } from "vitest";
import { StructuredPipelineError } from "@/lib/ai/structure";
import { runCatchPipeline } from "./pipeline";

function fakeAi(response: string): Ai {
  return { run: async () => ({ response }) } as unknown as Ai;
}

const VALID_JSON = JSON.stringify({
  headline: "Big Haul",
  items: [{ name: "Mahi Mahi", note: "Fresh off the boat" }],
  summary: "A great catch today.",
});

describe("runCatchPipeline — text input", () => {
  it("formats via AI when the binding is present", async () => {
    const draft = await runCatchPipeline(fakeAi(VALID_JSON), { kind: "text", text: "mahi mahi, fresh" });
    expect(draft.formatted.headline).toBe("Big Haul");
    expect(draft.formatted.items).toEqual([{ name: "Mahi Mahi", note: "Fresh off the boat" }]);
    expect(draft.rawTranscript).toBe("mahi mahi, fresh");
  });

  it("strips a markdown code fence around the AI's JSON", async () => {
    const fenced = "```json\n" + VALID_JSON + "\n```";
    const draft = await runCatchPipeline(fakeAi(fenced), { kind: "text", text: "mahi mahi" });
    expect(draft.formatted.headline).toBe("Big Haul");
  });

  it("falls back to a deterministic draft when the AI binding is absent (C9)", async () => {
    const draft = await runCatchPipeline(undefined, {
      kind: "text",
      text: "Mahi Mahi — fresh off the boat\nRed Snapper",
    });
    expect(draft.formatted.headline).toBe("Today's Catch");
    expect(draft.formatted.items).toEqual([
      { name: "Mahi Mahi", note: "fresh off the boat" },
      { name: "Red Snapper", note: "" },
    ]);
    expect(draft.rawTranscript).toBe("Mahi Mahi — fresh off the boat\nRed Snapper");
  });

  it("rejects blank text", async () => {
    await expect(runCatchPipeline(undefined, { kind: "text", text: "   " })).rejects.toThrow(StructuredPipelineError);
  });

  it("throws a 500 StructuredPipelineError when the AI response can't be parsed", async () => {
    await expect(runCatchPipeline(fakeAi("not json"), { kind: "text", text: "x" })).rejects.toMatchObject({
      status: 500,
    });
  });
});

describe("runCatchPipeline — price extraction (#71)", () => {
  it("carries an LLM-extracted priceCents onto the item", async () => {
    const withPrice = JSON.stringify({
      headline: "Big Haul",
      items: [{ name: "Mahi Mahi", note: "Fresh off the boat", priceCents: 1500 }],
      summary: "A great catch today.",
    });
    const draft = await runCatchPipeline(fakeAi(withPrice), { kind: "text", text: "mahi mahi, only $15 a pound" });
    expect(draft.formatted.items[0].priceCents).toBe(1500);
  });

  it("leaves priceCents undefined when no price was mentioned", async () => {
    const draft = await runCatchPipeline(fakeAi(VALID_JSON), { kind: "text", text: "mahi mahi, fresh" });
    expect(draft.formatted.items[0].priceCents).toBeUndefined();
  });
});

describe("runCatchPipeline — audio input", () => {
  it("501s when the AI binding is absent", async () => {
    await expect(
      runCatchPipeline(undefined, { kind: "audio", audio: new ArrayBuffer(4) }),
    ).rejects.toMatchObject({ status: 501 });
  });

  it("transcribes then formats when the AI binding is present", async () => {
    const ai = {
      run: async (model: string) => {
        if (model === "@cf/openai/whisper-tiny-en") return { text: "mahi mahi, fresh" };
        return { response: VALID_JSON };
      },
    } as unknown as Ai;

    const draft = await runCatchPipeline(ai, { kind: "audio", audio: new ArrayBuffer(4) });
    expect(draft.rawTranscript).toBe("mahi mahi, fresh");
    expect(draft.formatted.headline).toBe("Big Haul");
  });

  it("400s when Whisper detects no speech", async () => {
    const ai = { run: async () => ({ text: "" }) } as unknown as Ai;
    await expect(runCatchPipeline(ai, { kind: "audio", audio: new ArrayBuffer(4) })).rejects.toMatchObject({
      status: 400,
    });
  });
});

type Call = [string, unknown];

function recordingAi(respond: (model: string) => unknown): { ai: Ai; calls: Call[] } {
  const calls: Call[] = [];
  const ai = {
    run: async (model: string, input: unknown) => {
      calls.push([model, input]);
      return respond(model);
    },
  } as unknown as Ai;
  return { ai, calls };
}

const LLAMA = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const WHISPER = "@cf/openai/whisper-tiny-en";

describe("runCatchPipeline — characterization", () => {
  it("sends exactly one llama call with the pinned prompt shape (text)", async () => {
    const { ai, calls } = recordingAi(() => ({ response: VALID_JSON }));
    await runCatchPipeline(ai, { kind: "text", text: "mahi mahi, fresh" });
    expect(calls).toHaveLength(1);
    const [model, input] = calls[0] as [string, { messages: { role: string; content: string }[]; max_tokens: number }];
    expect(model).toBe(LLAMA);
    expect(input.max_tokens).toBe(2048);
    expect(input.messages).toHaveLength(2);
    expect(input.messages[0].role).toBe("system");
    expect(input.messages[0].content.startsWith("You are a seafood market assistant.")).toBe(true);
    expect(input.messages[0].content).toMatchInlineSnapshot(`"You are a seafood market assistant. Given a description of today's catch, output ONLY valid JSON (no markdown, no explanation) with this exact shape: { "headline": "short catchy headline", "items": [{ "name": "Fish Name", "note": "Optional detail", "priceCents": 1500 }], "summary": "One-sentence summary" }. Capitalize all fish names (e.g. "Mahi Mahi", "Red Snapper"). Use proper sentence casing for notes, headline, and summary. The note is optional: include size, cut, origin or prep ONLY if the speaker actually said it, in their words; otherwise use an empty string. Never restate or echo the fish name in the note (no "Fresh redfish"). Only include "priceCents" on an item if a price was actually said for it (e.g. "only $15 a pound" becomes 1500); omit the field entirely if no price was mentioned — do not guess or invent one."`);
    expect(input.messages[1]).toEqual({
      role: "user",
      content: "Format this input into structured JSON:\n\nmahi mahi, fresh",
    });
  });

  it("trims the transcript before sending", async () => {
    const { ai, calls } = recordingAi(() => ({ response: VALID_JSON }));
    const draft = await runCatchPipeline(ai, { kind: "text", text: "  mahi  " });
    const input = calls[0][1] as { messages: { content: string }[] };
    expect(input.messages[1].content.endsWith("\n\nmahi")).toBe(true);
    expect(draft.rawTranscript).toBe("mahi");
  });

  it("calls Whisper with the byte array, then llama with the trimmed text (audio)", async () => {
    const { ai, calls } = recordingAi((model) =>
      model === WHISPER ? { text: "  mahi mahi  " } : { response: VALID_JSON },
    );
    await runCatchPipeline(ai, { kind: "audio", audio: new Uint8Array([1, 2, 3]).buffer });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([WHISPER, { audio: [1, 2, 3] }]);
    expect(calls[1][0]).toBe(LLAMA);
    const input = calls[1][1] as { messages: { content: string }[] };
    expect(input.messages[1].content).toBe("Format this input into structured JSON:\n\nmahi mahi");
  });

  it("500s with rawTranscript when the format call rejects", async () => {
    const ai = {
      run: async () => {
        throw new Error("boom");
      },
    } as unknown as Ai;
    await expect(runCatchPipeline(ai, { kind: "text", text: "x" })).rejects.toMatchObject({
      status: 500,
      message: "Formatting failed",
      rawTranscript: "x",
    });
  });

  it("500s without rawTranscript when Whisper rejects", async () => {
    const ai = {
      run: async () => {
        throw new Error("boom");
      },
    } as unknown as Ai;
    const err = await runCatchPipeline(ai, { kind: "audio", audio: new ArrayBuffer(4) }).catch((e) => e);
    expect(err).toMatchObject({ status: 500, message: "Transcription failed" });
    expect(err.rawTranscript).toBeUndefined();
  });

  it("carries the parse message and transcript on parse failure", async () => {
    await expect(runCatchPipeline(fakeAi("not json"), { kind: "text", text: "x" })).rejects.toMatchObject({
      status: 500,
      message: "Failed to parse AI response into expected shape",
      rawTranscript: "x",
    });
  });

  it("reads `result` strings and already-parsed `response` objects", async () => {
    const viaResult = await runCatchPipeline(
      { run: async () => ({ result: VALID_JSON }) } as unknown as Ai,
      { kind: "text", text: "x" },
    );
    expect(viaResult.formatted.headline).toBe("Big Haul");
    const viaObject = await runCatchPipeline(
      { run: async () => ({ response: JSON.parse(VALID_JSON) }) } as unknown as Ai,
      { kind: "text", text: "x" },
    );
    expect(viaObject.formatted.headline).toBe("Big Haul");
  });

  it("500s on valid JSON with an invalid shape", async () => {
    await expect(
      runCatchPipeline(fakeAi(JSON.stringify({ headline: 1 })), { kind: "text", text: "x" }),
    ).rejects.toMatchObject({ status: 500, message: "Failed to parse AI response into expected shape" });
  });

  it("pins status/messages for blank text, no-ai audio and empty Whisper", async () => {
    await expect(runCatchPipeline(undefined, { kind: "text", text: " " })).rejects.toMatchObject({
      status: 400,
      message: "No text provided",
    });
    await expect(runCatchPipeline(undefined, { kind: "audio", audio: new ArrayBuffer(4) })).rejects.toMatchObject({
      status: 501,
      message: "Audio transcription requires the AI binding",
    });
    const ai = { run: async () => ({ text: "" }) } as unknown as Ai;
    await expect(runCatchPipeline(ai, { kind: "audio", audio: new ArrayBuffer(4) })).rejects.toMatchObject({
      status: 400,
      message: "No speech detected in audio",
    });
  });
});
