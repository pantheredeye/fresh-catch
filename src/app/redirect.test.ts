import { describe, expect, it } from "vitest";
import type { RequestInfo } from "rwsdk/worker";
import { safeRedirect, pageRedirect } from "./redirect";

const mockRequestInfo = (isAction: boolean) =>
  ({ isAction, request: new Request("https://example.com/login") }) as RequestInfo;

describe("safeRedirect", () => {
  it("throws during an action instead of returning a 302 (avoids opaque-redirect getReader crash)", () => {
    expect(() => safeRedirect(mockRequestInfo(true), "/login")).toThrow();
  });

  it("returns a real 302 on a document GET", () => {
    const res = safeRedirect(mockRequestInfo(false), "/login");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login");
  });

  it("preserves headers passed in", () => {
    const headers = new Headers({ "Set-Cookie": "foo=bar" });
    const res = safeRedirect(mockRequestInfo(false), "/login", headers);
    expect(res.headers.get("Set-Cookie")).toBe("foo=bar");
    expect(res.headers.get("Location")).toBe("/login");
  });
});

describe("pageRedirect", () => {
  it("returns undefined during an action instead of a 302 (avoids opaque-redirect getReader crash)", () => {
    expect(pageRedirect(mockRequestInfo(true), "/admin")).toBeUndefined();
  });

  it("returns a real 302 on a document GET", () => {
    const res = pageRedirect(mockRequestInfo(false), "/admin");
    expect(res).toBeInstanceOf(Response);
    expect(res!.status).toBe(302);
    expect(res!.headers.get("Location")).toBe("/admin");
  });
});
