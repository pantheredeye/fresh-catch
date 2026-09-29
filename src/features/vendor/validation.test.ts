import { describe, expect, it } from "vitest";
import { parseVendorForm, VENDOR_FIELD_LIMITS } from "./validation";

describe("parseVendorForm", () => {
  it("accepts a valid phone and display name", () => {
    const result = parseVendorForm({ displayName: "Evan", phone: "+16625551234" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Evan");
      expect(result.data.phone).toBe("+16625551234");
    }
  });

  it("treats blank fields as null", () => {
    const result = parseVendorForm({ displayName: "", phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("accepts a phone with no leading +", () => {
    const result = parseVendorForm({ phone: "16625551234" });
    expect(result.success).toBe(true);
  });

  it("rejects a phone with letters", () => {
    const result = parseVendorForm({ phone: "call-evan" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.phone).toBeTruthy();
  });

  it("rejects a phone that's too short", () => {
    const result = parseVendorForm({ phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects a display name over its limit", () => {
    const result = parseVendorForm({ displayName: "x".repeat(VENDOR_FIELD_LIMITS.displayName + 1) });
    expect(result.success).toBe(false);
  });
});
