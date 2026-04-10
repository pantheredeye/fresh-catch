import { Resend } from 'resend';
import { render } from '@react-email/components';
import { env } from 'cloudflare:workers';
import { OrderConfirmation } from '@/emails/OrderConfirmation';
import { OrderConfirmed } from '@/emails/OrderConfirmed';
import { AdminNewOrder } from '@/emails/AdminNewOrder';
import { PaymentReceived } from '@/emails/PaymentReceived';
import { ChatReplyNotification } from '@/emails/ChatReplyNotification';

// Lazy-init Resend client (only when email is sent)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

async function sendEmail({ to, subject, html, text, from }: SendEmailOptions) {
  // Skip in development if no API key configured
  if (!env.RESEND_API_KEY) {
    console.log('[Email] Skipping (no API key):', { to, subject });
    return { success: true, skipped: true };
  }

  try {
    const resend = getResendClient();

    const result = await resend.emails.send({
      from: from || 'Fresh Catch <orders@digitalglue.dev>',
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    console.log('[Email] Sent successfully:', { to, subject, id: result.data?.id });
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendOtpEmail(data: { to: string; code: string }) {
  // Inline HTML — @react-email render() uses react-dom/server which is
  // blocked in RWSDK's RSC environment.
  // Structure optimized for iOS auto-fill: code-first text, minimal nesting,
  // plain text MIME part for reliable heuristic parsing.
  const appUrl = env.APP_URL || 'https://market.digitalglue.dev';
  const deepLink = `${appUrl}/login?code=${data.code}`;
  const webOtpOrigin = new URL(appUrl).hostname;

  const html = `<!DOCTYPE html>
<html><head></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif">
<div style="background-color:#ffffff;margin:0 auto;padding:32px 40px;max-width:600px">
  <p style="color:#1a2b3d;font-size:18px;font-weight:600;line-height:28px;margin:0 0 24px 0">${data.code} is your verification code for Fresh Catch.</p>
  <div style="text-align:center;margin:0 0 24px;background:#f8fafc;border:2px solid #0066cc;border-radius:12px;padding:24px">
    <p style="color:#1a2b3d;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;font-family:monospace;-webkit-user-select:all;user-select:all;cursor:pointer">${data.code}</p>
    <p style="color:#94a3b8;font-size:12px;margin:12px 0 0 0">Tap code to select, then copy</p>
  </div>
  <div style="text-align:center;margin:0 0 24px">
    <a href="${deepLink}" style="display:inline-block;padding:12px 32px;background:#0066cc;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px">Sign in to Fresh Catch</a>
  </div>
  <p style="color:#64748b;font-size:14px;line-height:22px;margin:0 0 24px 0">This code expires in 10 minutes.</p>
  <hr style="border:none;border-top:1px solid #e0e0e0;margin:0 0 16px 0"/>
  <p style="color:#8898aa;font-size:12px;line-height:16px;margin:0;text-align:center">If you didn't request this, ignore this email.</p>
</div>
</body></html>`;

  const text = `${data.code} is your verification code for Fresh Catch.\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\n@${webOtpOrigin} #${data.code}`;

  return sendEmail({
    to: data.to,
    subject: `${data.code} is your Fresh Catch code`,
    html,
    text,
    from: 'Fresh Catch <auth@digitalglue.dev>',
  });
}

// Helper functions for order emails
export async function sendOrderConfirmationEmail(data: {
  to: string;
  customerName: string;
  orderNumber: number;
  items: string;
  preferredDate?: string;
  notes?: string;
  businessName: string;
}) {
  const html = await render(
    OrderConfirmation({
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      items: data.items,
      preferredDate: data.preferredDate,
      notes: data.notes,
      businessName: data.businessName,
    })
  );

  return sendEmail({
    to: data.to,
    subject: `Order #${data.orderNumber} Received - ${data.businessName}`,
    html,
  });
}

export async function sendOrderConfirmedEmail(data: {
  to: string;
  customerName: string;
  orderNumber: number;
  items: string;
  priceCents: number | null;
  platformFeeCents?: number | null;
  feeModel?: string | null;
  totalDueCents?: number | null;
  depositAmountCents?: number | null;
  checkoutUrl?: string | null;
  adminNotes?: string;
  preferredDate?: string;
  businessName: string;
  isUpdate?: boolean;
}) {
  const html = await render(
    OrderConfirmed({
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      items: data.items,
      priceCents: data.priceCents,
      platformFeeCents: data.platformFeeCents,
      feeModel: data.feeModel as any,
      totalDueCents: data.totalDueCents,
      depositAmountCents: data.depositAmountCents,
      checkoutUrl: data.checkoutUrl,
      adminNotes: data.adminNotes,
      preferredDate: data.preferredDate,
      businessName: data.businessName,
    })
  );

  return sendEmail({
    to: data.to,
    subject: data.isUpdate
      ? `Order #${data.orderNumber} Updated - ${data.businessName}`
      : `Order #${data.orderNumber} Confirmed - ${data.businessName}`,
    html,
  });
}

export async function sendAdminNewOrderEmail(data: {
  to: string;
  orderNumber: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: string;
  preferredDate?: string;
  notes?: string;
  businessName: string;
}) {
  const html = await render(
    AdminNewOrder({
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      items: data.items,
      preferredDate: data.preferredDate,
      notes: data.notes,
      businessName: data.businessName,
    })
  );

  return sendEmail({
    to: data.to,
    subject: `🔔 New Order #${data.orderNumber} - ${data.businessName}`,
    html,
  });
}

export async function sendPaymentReceivedEmail(data: {
  to: string;
  orderNumber: number;
  amountPaid: number;
  totalDue: number;
  remainingBalance: number;
  paymentMethod: string;
  businessName: string;
}) {
  const html = await render(
    PaymentReceived({
      orderNumber: data.orderNumber,
      amountPaid: data.amountPaid,
      totalDue: data.totalDue,
      remainingBalance: data.remainingBalance,
      paymentMethod: data.paymentMethod,
      businessName: data.businessName,
    })
  );

  return sendEmail({
    to: data.to,
    subject: `Payment Received - Order #${data.orderNumber} - ${data.businessName}`,
    html,
  });
}

export async function sendChatReplyNotificationEmail(data: {
  to: string;
  customerName: string;
  vendorName: string;
  messagePreview: string;
  chatPath: string;
  businessName: string;
}) {
  const appUrl = env.APP_URL || 'https://market.digitalglue.dev';
  const chatUrl = `${appUrl}${data.chatPath}`;

  const html = await render(
    ChatReplyNotification({
      customerName: data.customerName,
      vendorName: data.vendorName,
      messagePreview: data.messagePreview,
      chatUrl,
      businessName: data.businessName,
    })
  );

  return sendEmail({
    to: data.to,
    subject: `${data.vendorName} from ${data.businessName} replied to your message`,
    html,
  });
}
