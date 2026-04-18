import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type Result = { success: boolean; error?: string };

const save = (conversationId: string, email: string) =>
  vitestInvoke<Result>("saveCustomerEmail", conversationId, email);

describe("saveCustomerEmail email format", () => {
  const anyConvId = "conv-unused-for-invalid-email-path";

  it("rejects empty string", async () => {
    const r = await save(anyConvId, "");
    expect(r).toEqual({ success: false, error: "Invalid email format" });
  });

  it("rejects string without @", async () => {
    const r = await save(anyConvId, "not-an-email");
    expect(r).toEqual({ success: false, error: "Invalid email format" });
  });

  it("rejects missing local part", async () => {
    const r = await save(anyConvId, "@no-local.com");
    expect(r).toEqual({ success: false, error: "Invalid email format" });
  });

  it("rejects missing domain part", async () => {
    const r = await save(anyConvId, "no-domain@");
    expect(r).toEqual({ success: false, error: "Invalid email format" });
  });

  it("rejects whitespace in local part", async () => {
    const r = await save(anyConvId, "spaces in@email.com");
    expect(r).toEqual({ success: false, error: "Invalid email format" });
  });
});
