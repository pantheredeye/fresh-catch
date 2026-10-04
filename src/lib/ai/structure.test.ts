import { describe, expect, it } from "vitest";
import { runStructured, StructuredPipelineError } from "./structure";

type N = { n: number };

function validate(obj: unknown): N {
  if (typeof obj !== "object" || obj === null || typeof (obj as N).n !== "number") throw new Error("bad");
  return obj as N;
}

const opts = { systemPrompt: "SYS", validate };
const JSON_N = '{"n":1}';

function recordingAi(respond: (model: string) => unknown) {
  const calls: [string, any][] = [];
  const ai = {
    run: async (model: string, input: unknown) => {
      calls.push([model, input]);
      return respond(model);
    },
  } as unknown as Ai;
  return { ai, calls };
}

const fake = (resp: unknown): Ai => ({ run: async () => resp }) as unknown as Ai;
const text = (t: string) => ({ kind: "text", text: t }) as const;
const audio = () => ({ kind: "audio", audio: new ArrayBuffer(4) }) as const;
const throwingAi = {
  run: async () => {
    throw new Error("boom");
  },
} as unknown as Ai;

describe("runStructured — text", () => {
  it("returns validated data and the trimmed transcript", async () => {
    expect(await runStructured(fake({ response: JSON_N }), text("  hi "), opts)).toEqual({
      data: { n: 1 },
      rawTranscript: "hi",
    });
  });

  it("uses default model/max_tokens and system prompt", async () => {
    const { ai, calls } = recordingAi(() => ({ response: JSON_N }));
    await runStructured(ai, text("hi"), opts);
    expect(calls[0][0]).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    expect(calls[0][1].max_tokens).toBe(1024);
    expect(calls[0][1].messages[0]).toEqual({ role: "system", content: "SYS" });
  });

  it("honors model and maxTokens overrides", async () => {
    const { ai, calls } = recordingAi(() => ({ response: JSON_N }));
    await runStructured(ai, text("hi"), { ...opts, model: "m", maxTokens: 5 });
    expect(calls[0][0]).toBe("m");
    expect(calls[0][1].max_tokens).toBe(5);
  });

  it("normalizes response/result/object shapes", async () => {
    for (const resp of [{ response: JSON_N }, { result: JSON_N }, { response: { n: 1 } }]) {
      expect((await runStructured(fake(resp), text("x"), opts)).data).toEqual({ n: 1 });
    }
  });

  it("parses fenced JSON", async () => {
    for (const resp of ["```json\n" + JSON_N + "\n```", "```\n" + JSON_N + "\n```"]) {
      expect((await runStructured(fake({ response: resp }), text("x"), opts)).data).toEqual({ n: 1 });
    }
  });

  it("500s with transcript on validator failure and invalid JSON", async () => {
    for (const resp of ['{"n":"x"}', "not json"]) {
      await expect(runStructured(fake({ response: resp }), text("x"), opts)).rejects.toMatchObject({
        status: 500,
        message: "Failed to parse AI response into expected shape",
        rawTranscript: "x",
      });
    }
  });

  it("500s 'Formatting failed' when ai.run rejects", async () => {
    await expect(runStructured(throwingAi, text("x"), opts)).rejects.toMatchObject({
      status: 500,
      message: "Formatting failed",
      rawTranscript: "x",
    });
  });

  it("400s on blank text", async () => {
    await expect(runStructured(undefined, text("  "), opts)).rejects.toMatchObject({ status: 400 });
    await expect(runStructured(undefined, text("  "), opts)).rejects.toThrow(StructuredPipelineError);
  });

  it("uses fallback without ai; 501s with transcript when none", async () => {
    const out = await runStructured(undefined, text(" hi "), { ...opts, fallback: (t) => ({ n: t.length }) });
    expect(out).toEqual({ data: { n: 2 }, rawTranscript: "hi" });
    await expect(runStructured(undefined, text("hi"), opts)).rejects.toMatchObject({
      status: 501,
      message: "Structuring requires the AI binding",
      rawTranscript: "hi",
    });
  });
});

describe("runStructured — audio", () => {
  it("501s without ai", async () => {
    await expect(runStructured(undefined, audio(), opts)).rejects.toMatchObject({ status: 501 });
  });

  it("500s when Whisper rejects", async () => {
    await expect(runStructured(throwingAi, audio(), opts)).rejects.toMatchObject({
      status: 500,
      message: "Transcription failed",
    });
  });

  it("400s on empty transcript", async () => {
    await expect(runStructured(fake({ text: "" }), audio(), opts)).rejects.toMatchObject({ status: 400 });
  });

  it("transcribes, then structures", async () => {
    const { ai, calls } = recordingAi((m) => (m.includes("whisper") ? { text: "hello" } : { response: JSON_N }));
    expect(await runStructured(ai, audio(), opts)).toEqual({ data: { n: 1 }, rawTranscript: "hello" });
    expect(calls).toHaveLength(2);
  });
});
