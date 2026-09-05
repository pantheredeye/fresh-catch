import { describe, expect, it } from "vitest";
import { generateCsrfToken, requireCsrf } from "./csrf";

describe("csrf", () => {
  it("accepts a matching token", () => {
    const token = generateCsrfToken();
    expect(requireCsrf(token, token)).toBe(true);
  });

  it("rejects a mismatched token", () => {
    expect(requireCsrf(generateCsrfToken(), generateCsrfToken())).toBe(false);
  });

  it("rejects missing tokens", () => {
    expect(requireCsrf(undefined, "x")).toBe(false);
    expect(requireCsrf("x", undefined)).toBe(false);
    expect(requireCsrf(null, null)).toBe(false);
  });

  it("generates a token long enough to be unguessable", () => {
    expect(generateCsrfToken().length).toBeGreaterThan(30);
  });

  it("generates distinct tokens", () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});
