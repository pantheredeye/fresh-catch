import type { Bindings } from "@/types";
import type { Order } from "@/lib/db";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatCents } from "@/features/orders/components";

/**
 * Customer receipt for a Stripe payment (#60's done-when). Plain HTML, same
 * shape as the request alerts in `features/requests/notifications.ts` — no
 * `@react-email/components` (on CLAUDE.md's do-not-reintroduce list).
 *
 * Silently skips when the order has no email on file: requests are
 * anonymous-first, so that's an ordinary state, not an error.
 */
export async function sendPaymentReceipt(
  env: Bindings,
  order: Order,
  payment: { amountCents: number; isDeposit: boolean },
): Promise<void> {
  if (!order.contactEmail) return;

  const vendor = await db.vendor.findFirst();
  const businessName = vendor?.name ?? "Fresh Catch";
  const remaining = order.totalDue != null ? Math.max(order.totalDue - order.amountPaid, 0) : 0;
  const threadUrl = order.requestId ? `${env.APP_URL}/requests/${order.requestId}` : env.APP_URL;

  const rows: Array<[string, string]> = [
    [payment.isDeposit ? "Deposit paid" : "Amount paid", formatCents(payment.amountCents)],
  ];
  if (order.totalDue != null) rows.push(["Order total", formatCents(order.totalDue)]);
  rows.push(remaining > 0 ? ["Balance remaining", formatCents(remaining)] : ["Balance", "Paid in full"]);

  await sendEmail(env, {
    to: order.contactEmail,
    subject: `Receipt for order #${order.orderNumber} — ${businessName}`,
    html: receiptHtml({ businessName, orderNumber: order.orderNumber, contactName: order.contactName, rows, threadUrl }),
  });
}

function receiptHtml(data: {
  businessName: string;
  orderNumber: number;
  contactName: string;
  rows: Array<[string, string]>;
  threadUrl: string;
}): string {
  const rows = data.rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 6px 0; color: #555;">${label}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${value}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #f4f4f4; padding: 24px;">
    <table role="presentation" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
      <tr>
        <td>
          <h1 style="font-size: 20px; margin: 0 0 8px;">Thanks, ${data.contactName}!</h1>
          <p style="font-size: 16px; color: #333; margin: 0 0 24px;">We received your payment for order #${data.orderNumber} from ${data.businessName}.</p>
          <table role="presentation" style="width: 100%; font-size: 16px; border-top: 1px solid #e5e5e5; margin: 0 0 24px;">
            ${rows}
          </table>
          <p style="margin: 0;"><a href="${data.threadUrl}" style="font-size: 16px;">View your order</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
