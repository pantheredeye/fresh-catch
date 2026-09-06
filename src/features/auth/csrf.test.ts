import { describe, expect, it } from "vitest";
import { createDeviceCsrfToken, generateCsrfToken, requireCsrf, verifyDeviceCsrfToken } from "./csrf";

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

describe("device csrf (R4)", () => {
  it("verifies a token created for the same device+secret", async () => {
    const token = await createDeviceCsrfToken("device-a", "secret-1");
    expect(await verifyDeviceCsrfToken("device-a", "secret-1", token)).toBe(true);
  });

  it("rejects a token from a different device", async () => {
    const token = await createDeviceCsrfToken("device-a", "secret-1");
    expect(await verifyDeviceCsrfToken("device-b", "secret-1", token)).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createDeviceCsrfToken("device-a", "secret-1");
    expect(await verifyDeviceCsrfToken("device-a", "secret-2", token)).toBe(false);
  });

  it("rejects a missing token", async () => {
    expect(await verifyDeviceCsrfToken("device-a", "secret-1", undefined)).toBe(false);
  });

  it("is deterministic for the same device+secret", async () => {
    const a = await createDeviceCsrfToken("device-a", "secret-1");
    const b = await createDeviceCsrfToken("device-a", "secret-1");
    expect(a).toBe(b);
  });
});
