import { Resend } from 'resend';
import { render } from '@react-email/components';
import { env } from 'cloudflare:workers';
import { OrderConfirmation } from '@/emails/OrderConfirmation';
import { OrderConfirmed } from '@/emails/OrderConfirmed';
import { AdminNewOrder } from '@/emails/AdminNewOrder';

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
