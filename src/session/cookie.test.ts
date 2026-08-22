import { describe, expect, it, vi } from "vitest";
import { createSessionCookie } from "./cookie";

const TEN_YEARS = 10 * 365 * 24 * 60 * 60;

describe("createSessionCookie", () => {
  it("emits SameSite=Lax, HttpOnly, Path=/", () => {
    const cookie = createSessionCookie({ name: "session", sessionId: "abc" });
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("SameSite=Strict");
  });

  it("omits Secure in Vite dev", () => {
    vi.stubEnv("DEV", true);
    const cookie = createSessionCookie({ name: "session", sessionId: "abc" });
    expect(cookie).not.toContain("Secure");
    vi.unstubAllEnvs();
  });

  it("includes Secure outside Vite dev", () => {
    vi.stubEnv("DEV", false);
    const cookie = createSessionCookie({ name: "session", sessionId: "abc" });
    expect(cookie).toContain("Secure");
    vi.unstubAllEnvs();
  });

  it("defaults omitted maxAge to a 10-year persistent cookie", () => {
    const cookie = createSessionCookie({ name: "session", sessionId: "abc" });
    expect(cookie).toContain(`Max-Age=${TEN_YEARS}`);
  });

  it("treats maxAge: true the same as omitted", () => {
    const cookie = createSessionCookie({ name: "session", sessionId: "abc", maxAge: true });
    expect(cookie).toContain(`Max-Age=${TEN_YEARS}`);
  });

  it("passes through a numeric maxAge", () => {
    const cookie = createSessionCookie({ name: "session", sessionId: "abc", maxAge: 3600 });
    expect(cookie).toContain("Max-Age=3600");
  });
});
