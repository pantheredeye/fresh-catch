import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email";
import type { Bindings } from "@/types";

describe("sendEmail", () => {
  it("skips the send and returns false when RESEND_API_KEY is unset (dev)", async () => {
    const bindings = { ...(env as unknown as Bindings), RESEND_API_KEY: undefined };
    const sent = await sendEmail(bindings, { to: "a@example.com", subject: "Hi", html: "<p>hi</p>" });
    expect(sent).toBe(false);
  });

  it("posts to Resend with the message payload when a key is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const bindings = { ...(env as unknown as Bindings), RESEND_API_KEY: "re_test" };
    const sent = await sendEmail(bindings, { to: "a@example.com", subject: "Hi", html: "<p>hi</p>" });
    expect(sent).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({ to: "a@example.com", subject: "Hi" });
  });

  it("passes an array `to` through unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const bindings = { ...(env as unknown as Bindings), RESEND_API_KEY: "re_test" };
    await sendEmail(bindings, { to: ["a@example.com", "b@example.com"], subject: "Hi", html: "<p>hi</p>" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual(["a@example.com", "b@example.com"]);
  });

  it("is blocked from reaching the live API by the test-setup guard", async () => {
    const bindings = { ...(env as unknown as Bindings), RESEND_API_KEY: "re_test" };
    await expect(sendEmail(bindings, { to: "a@example.com", subject: "Hi", html: "x" })).rejects.toThrow(/live Resend/);
  });
});
