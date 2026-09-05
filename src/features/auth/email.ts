import type { Bindings } from "@/types";
import { sendEmail } from "@/lib/email";

// Plain HTML template, not @react-email/components — that broke under rwsdk
// 1.5+ and is a deliberate scope cut for v2 (see CLAUDE.md "Removed in the
// rebuild").
const FROM_ADDRESS = "Fresh Catch <login@notifications.freshcatch.app>";

function loginCodeEmailHtml(code: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #f4f4f4; padding: 24px;">
    <table role="presentation" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
      <tr>
        <td>
          <h1 style="font-size: 20px; margin: 0 0 16px;">Your Fresh Catch login code</h1>
          <p style="font-size: 16px; color: #333; margin: 0 0 24px;">
            Enter this code to finish signing in. It expires in 10 minutes.
          </p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0 0 24px;">
            ${code}
          </p>
          <p style="font-size: 14px; color: #666; margin: 0;">
            If you didn't request this, you can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends the login code via Resend. Without RESEND_API_KEY (e.g. local dev),
 * the send is skipped and logged instead — see .env.example.
 * Returns whether an email was actually sent.
 */
export async function sendLoginCodeEmail(
  env: Bindings,
  email: string,
  code: string,
): Promise<boolean> {
  return sendEmail(env, {
    from: FROM_ADDRESS,
    to: email,
    subject: `Your Fresh Catch login code: ${code}`,
    html: loginCodeEmailHtml(code),
  });
}
