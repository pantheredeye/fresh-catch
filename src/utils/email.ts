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
  from?: string;
}

async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // Skip in development if no API key configured
  if (!env.RESEND_API_KEY) {
    console.log('[Email] Skipping (no API key):', { to, subject });
    return { success: true, skipped: true };
  }

  try {
    const resend = getResendClient();

    const result = await resend.emails.send({
      from: from || 'Fresh Catch <orders@freshcatch.app>', // Update with your verified domain
      to,
      subject,
      html,
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
  // blocked in RWSDK's RSC environment
  const html = `<!DOCTYPE html><html><head></head><body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif"><div style="background-color:#ffffff;margin:0 auto;padding:20px 0 48px;margin-bottom:64px;max-width:600px"><h1 style="color:#1a2b3d;font-size:32px;font-weight:bold;margin:40px 0;padding:0 40px">Sign in to Fresh Catch</h1><p style="color:#64748b;font-size:16px;line-height:26px;margin:16px 40px">Enter this code to sign in:</p><div style="text-align:center;margin:0 40px 24px;background:#f8fafc;border:2px solid #0066cc;border-radius:12px;padding:24px"><p style="color:#1a2b3d;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;font-family:monospace">${data.code}</p></div><p style="color:#64748b;font-size:16px;line-height:26px;margin:16px 40px">Expires in 10 minutes.</p><hr style="border-color:#e0e0e0;margin:26px 40px"/><p style="color:#8898aa;font-size:12px;line-height:16px;margin:0 40px;text-align:center">If you didn't request this, ignore this email.</p></div></body></html>`;

  return sendEmail({
    to: data.to,
    subject: `${data.code} is your Fresh Catch code`,
    html,
    from: 'Fresh Catch <auth@freshcatch.app>',
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
    subject: `Order #${data.orderNumber} Confirmed - ${data.businessName}`,
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
  const appUrl = env.APP_URL || 'https://freshcatch.app';
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
