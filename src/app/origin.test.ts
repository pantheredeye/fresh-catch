import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./origin";

const req = (method: string, origin?: string) =>
  new Request("https://freshcatch.app/admin/settings/stripe", {
    method,
    headers: origin ? { Origin: origin } : {},
  });

describe("isAllowedOrigin", () => {
  it("allows a matching Origin", () => {
    expect(isAllowedOrigin(req("POST", "https://freshcatch.app"))).toBe(true);
  });

  it("rejects a mismatched Origin", () => {
    expect(isAllowedOrigin(req("POST", "https://evil.example"))).toBe(false);
  });

  it("allows a missing Origin (non-browser client)", () => {
    expect(isAllowedOrigin(req("POST"))).toBe(true);
  });
});
