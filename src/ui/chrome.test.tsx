import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { mintAdminSession } from "@/features/auth/test-helpers";
import app from "../index";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

const get = async (path: string, cookie?: string) =>
  (await app.request(path, cookie ? { headers: { Cookie: cookie } } : {}, env)).text();

const header = (html: string) => html.slice(0, html.indexOf("</nav>"));
const footer = (html: string) => html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));

describe("shared header + footer", () => {
  it("anon header has Requests + Log in, never /admin or /logout", async () => {
    for (const path of ["/", "/requests", "/order", "/ask", "/login"]) {
      const h = header(await get(path));
      expect(h, path).toContain('<a href="/requests">Requests</a>');
      expect(h, path).toContain('<a href="/login">Log in</a>');
      expect(h, path).not.toContain("/admin");
      expect(h, path).not.toContain("/logout");
    }
  });

  it("signed-in header has Requests + Log out form, never /admin or /login", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    for (const path of ["/", "/requests", "/order", "/ask"]) {
      const h = header(await get(path, cookie));
      expect(h, path).toContain('<a href="/requests">Requests</a>');
      expect(h, path).toContain('action="/logout"');
      expect(h, path).toContain("Log out");
      expect(h, path).not.toContain("/admin");
      expect(h, path).not.toContain("/login");
    }
  });

  it("footer has only the © Digital Glue link", async () => {
    const f = footer(await get("/"));
    expect(f).toContain("Digital Glue");
    expect(f.match(/<a /g)).toHaveLength(1);
    expect(f).not.toContain("/login");
    expect(f).not.toContain("/logout");
  });

  it("/requests: logged out explains device-local requests and shows Log in link", async () => {
    const html = await get("/requests");
    expect(html).toContain("holding these on this phone for now. Log in and we&#39;ll save them to your account.");
    expect(html).toContain('<form method="get" action="/login">');
    expect(html).not.toContain("Logged in as");
    // status block precedes the list
    expect(html.indexOf("data-requests-status")).toBeLessThan(html.indexOf("No requests yet."));
  });

  it("/requests: admin sees Admin link and logout form", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const html = await get("/requests", cookie);
    expect(html).toContain("Logged in as admin@example.com.");
    expect(html).toContain('<a href="/admin">Admin</a>');
    expect(html.indexOf("data-requests-status")).toBeLessThan(html.indexOf("No requests yet."));
  });
});
