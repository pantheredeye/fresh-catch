import type { Bindings } from "@/types";

// Placeholder sender domain, same as wrangler.jsonc's other cutover
// placeholders (worker name, D1 database_id) — swap at cutover.
const DEFAULT_FROM = "Fresh Catch <notifications@digitalglue.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

/** Escapes text for interpolation into an HTML email body — templates here are plain strings, not JSX, so nothing else does this for us. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sends an email via Resend. Without RESEND_API_KEY (e.g. local dev), the
 * send is skipped and logged instead — see .env.example. Returns whether an
 * email was actually sent.
 */
export async function sendEmail(env: Bindings, message: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(`[dev] email to ${message.to}: ${message.subject}`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from ?? DEFAULT_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }

  return true;
}
