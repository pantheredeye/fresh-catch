import { describe, expect, it } from "vitest";
import { createSessionValue, parseSessionValue } from "./session";

const payload = { userId: "u1", email: "a@example.com", isAdmin: false, csrfToken: "tok" };

describe("signed session cookie", () => {
  it("round-trips a signed payload", async () => {
    const value = await createSessionValue(payload, "test-secret");
    const parsed = await parseSessionValue(value, "test-secret");
    expect(parsed).toMatchObject(payload);
    expect(typeof parsed?.iat).toBe("number");
  });

  it("rejects a tampered payload", async () => {
    const value = await createSessionValue(payload, "test-secret");
    const [encodedPayload, sig] = value.split(".");
    const flipped = encodedPayload.endsWith("A")
      ? `${encodedPayload.slice(0, -1)}B`
      : `${encodedPayload.slice(0, -1)}A`;
    expect(await parseSessionValue(`${flipped}.${sig}`, "test-secret")).toBeNull();
  });

  it("rejects a payload signed with a different secret", async () => {
    const value = await createSessionValue(payload, "secret-a");
    expect(await parseSessionValue(value, "secret-b")).toBeNull();
  });

  it("returns null for a missing or malformed cookie value", async () => {
    expect(await parseSessionValue(undefined, "test-secret")).toBeNull();
    expect(await parseSessionValue(null, "test-secret")).toBeNull();
    expect(await parseSessionValue("", "test-secret")).toBeNull();
    expect(await parseSessionValue("not-a-valid-token", "test-secret")).toBeNull();
  });
});
