import { describe, expect, it } from "vitest";
import { CatchPipelineError, runCatchPipeline } from "./pipeline";

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
    await expect(runCatchPipeline(undefined, { kind: "text", text: "   " })).rejects.toThrow(CatchPipelineError);
  });

  it("throws a 500 CatchPipelineError when the AI response can't be parsed", async () => {
    await expect(runCatchPipeline(fakeAi("not json"), { kind: "text", text: "x" })).rejects.toMatchObject({
      status: 500,
    });
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
