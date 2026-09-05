import type { Bindings } from "@/types";
import { escapeHtml, sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import type { FishRequest } from "@/lib/db";
import { requestTitle } from "./components";

function firstAdminEmail(env: Bindings): string | undefined {
  return env.ADMIN_EMAILS.split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
}

/** `Vendor.notificationEmail` when set, else the first `ADMIN_EMAILS` entry — see issue #64. */
async function vendorAlertRecipient(env: Bindings): Promise<string | undefined> {
  const vendor = await db.vendor.findFirst();
  return vendor?.notificationEmail ?? firstAdminEmail(env);
}

/** `heading`/`body` are customer-supplied free text (contactName, species, notes) — always escaped, never trusted. */
function alertHtml(heading: string, body: string, linkHref: string, linkText: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #f4f4f4; padding: 24px;">
    <table role="presentation" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
      <tr>
        <td>
          <h1 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(heading)}</h1>
          <p style="font-size: 16px; color: #333; margin: 0 0 24px; white-space: pre-wrap;">${escapeHtml(body)}</p>
          <p style="margin: 0;"><a href="${linkHref}" style="font-size: 16px;">${linkText}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function requestSummary(request: FishRequest): string {
  return request.quantity ? `${requestTitle(request)} — ${request.quantity}` : requestTitle(request);
}

/** Evan alert: a customer opened a new request. Skips silently if no recipient is configured. */
export async function notifyVendorOfNewRequest(env: Bindings, request: FishRequest): Promise<void> {
  const to = await vendorAlertRecipient(env);
  if (!to) return;
  const url = `${env.APP_URL}/admin/requests/${request.id}`;
  await sendEmail(env, {
    to,
    subject: `New request: ${requestTitle(request)}`,
    html: alertHtml(`New request from ${request.contactName}`, requestSummary(request), url, "View request"),
  });
}

/** Evan alert: a customer replied on an existing thread. Skips silently if no recipient is configured. */
export async function notifyVendorOfCustomerReply(env: Bindings, request: FishRequest): Promise<void> {
  const to = await vendorAlertRecipient(env);
  if (!to) return;
  const url = `${env.APP_URL}/admin/requests/${request.id}`;
  await sendEmail(env, {
    to,
    subject: `New reply: ${requestTitle(request)}`,
    html: alertHtml(`${request.contactName} replied`, requestSummary(request), url, "View request"),
  });
}

/** Customer alert: Evan replied (or opened a vendor-initiated thread). Skips silently when there's no email on file. */
export async function notifyCustomerOfVendorReply(env: Bindings, request: FishRequest): Promise<void> {
  if (!request.contactEmail) return;
  const url = `${env.APP_URL}/requests/${request.id}`;
  await sendEmail(env, {
    to: request.contactEmail,
    subject: `Fresh Catch replied: ${requestTitle(request)}`,
    html: alertHtml("Fresh Catch replied to your request", requestSummary(request), url, "View your request"),
  });
}
