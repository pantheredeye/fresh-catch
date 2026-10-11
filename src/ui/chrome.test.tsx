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
  it("header has My requests, never /admin or /login", async () => {
    for (const path of ["/", "/requests", "/requests/new", "/login"]) {
      const h = header(await get(path));
      expect(h, path).toContain('<a href="/requests">My requests</a>');
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

  it("/requests: logged out shows Log in link", async () => {
    const html = await get("/requests");
    expect(html).toContain("See these on another device?");
    expect(html).toContain('<a href="/login">Log in</a>');
  });

  it("/requests: admin sees Admin link and logout form", async () => {
    const { cookie } = await mintAdminSession(env as unknown as Bindings);
    const html = await get("/requests", cookie);
    expect(html).toContain("Signed in as");
    expect(html).toContain('<a href="/admin">Admin</a>');
    expect(html).toContain('action="/logout"');
  });
});
