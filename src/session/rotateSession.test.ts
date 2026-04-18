import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

const check = (a: string, b: string) =>
  vitestInvoke<boolean>("validateCsrfToken", a, b);

describe("validateCsrfToken", () => {
  it("returns true for matching tokens", async () => {
    expect(await check("abc123", "abc123")).toBe(true);
  });

  it("returns false for mismatched tokens of same length", async () => {
    expect(await check("abc123", "xyz789")).toBe(false);
  });

  it("returns false for different length tokens", async () => {
    expect(await check("short", "muchlongertoken")).toBe(false);
  });

  it("returns false for empty vs non-empty", async () => {
    expect(await check("", "notempty")).toBe(false);
  });

  it("returns true for empty vs empty", async () => {
    expect(await check("", "")).toBe(true);
  });
});
