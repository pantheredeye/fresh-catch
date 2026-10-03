import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { sendEmail } from "./email";
import type { Bindings } from "@/types";

describe("sendEmail", () => {
  it("skips the send and returns false when RESEND_API_KEY is unset (dev)", async () => {
    const bindings = { ...(env as unknown as Bindings), RESEND_API_KEY: undefined };
    const sent = await sendEmail(bindings, { to: "a@example.com", subject: "Hi", html: "<p>hi</p>" });
    expect(sent).toBe(false);
  });
});
