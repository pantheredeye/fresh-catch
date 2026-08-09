import { describe, expect, it } from "vitest";
import { scoreVoiceConfidence, voiceTools, type MarketContext } from "@/api/voice-tools";

function makeMarket(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    id: "market-1",
    name: "Folly Beach Market",
    type: "regular",
    schedule: "Saturdays 9-1",
    active: true,
    subtitle: null,
    locationDetails: null,
    customerInfo: null,
    catchPreview: null,
    expiresAt: null,
    ...overrides,
  };
}

describe("scoreVoiceConfidence", () => {
  it("scores a clean, fully-populated create_market command as the 0.9 baseline", () => {
    const score = scoreVoiceConfidence({
      data: { name: "Folly Beach Market", schedule: "Saturdays 9-1" },
      rawTranscript: "add a new market called folly beach market on saturdays",
      markets: [],
      tool: voiceTools.create_market,
    });
    expect(score).toBe(0.9);
  });

  it("drops below 0.7 when a required field is missing", () => {
    const score = scoreVoiceConfidence({
      data: { name: "Folly Beach Market" }, // missing required `schedule`
      rawTranscript: "add a new market called folly beach market",
      markets: [],
      tool: voiceTools.create_market,
    });
    expect(score).toBeLessThan(0.7);
  });

  it("drops below 0.7 when required array data is an empty JSON string", () => {
    const score = scoreVoiceConfidence({
      data: { headline: "Fresh today", items: "[]", summary: "Great catch" },
      rawTranscript: "update the catch",
      markets: [],
      tool: voiceTools.update_catch,
    });
    expect(score).toBeLessThan(0.7);
  });

  it("drops below 0.7 when the matched market name has no distinctive overlap with the transcript", () => {
    const matchedMarket = makeMarket();
    const score = scoreVoiceConfidence({
      data: { marketId: matchedMarket.id, schedule: "Sundays" },
      rawTranscript: "change the schedule to sundays",
      matchedMarket,
      markets: [matchedMarket],
      tool: voiceTools.update_market,
    });
    expect(score).toBeLessThan(0.7);
  });

  it("scores 0.7-0.8 when multiple markets' names plausibly match the transcript", () => {
    const matchedMarket = makeMarket({ id: "market-1", name: "Folly Beach Market" });
    const otherMarket = makeMarket({ id: "market-2", name: "Folly Road Market" });
    const score = scoreVoiceConfidence({
      data: { marketId: matchedMarket.id, schedule: "Sundays" },
      rawTranscript: "update folly market schedule to sundays",
      matchedMarket,
      markets: [matchedMarket, otherMarket],
      tool: voiceTools.update_market,
    });
    expect(score).toBeGreaterThanOrEqual(0.7);
    expect(score).toBeLessThan(0.9);
  });

  it("scores 0.9 for a strong, unambiguous market match", () => {
    const matchedMarket = makeMarket({ id: "market-1", name: "Folly Beach Market" });
    const score = scoreVoiceConfidence({
      data: { marketId: matchedMarket.id, schedule: "Sundays" },
      rawTranscript: "update folly beach market schedule to sundays",
      matchedMarket,
      markets: [matchedMarket],
      tool: voiceTools.update_market,
    });
    expect(score).toBe(0.9);
  });

  it("never returns below the 0.5 floor", () => {
    const matchedMarket = makeMarket();
    const score = scoreVoiceConfidence({
      data: { marketId: matchedMarket.id, catchPreview: "" }, // missing required catchPreview
      rawTranscript: "do something unrelated",
      matchedMarket,
      markets: [matchedMarket],
      tool: voiceTools.update_market_catch,
    });
    expect(score).toBeGreaterThanOrEqual(0.5);
  });
});
