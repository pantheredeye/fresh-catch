import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../../index";

describe("showcase route", () => {
  it("GET /dev/showcase renders every primitive (dev/test builds only)", async () => {
    const res = await app.request("/dev/showcase", {}, env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Design showcase");
    expect(body).toContain("btn-primary");
    expect(body).toContain("field-input");
    expect(body).toContain("class=\"card\"");
    expect(body).toContain("sheet");
  });
});
