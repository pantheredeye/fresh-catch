"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/utils/email";
import { getStripe } from "@/utils/stripe";
import { getPaymentStatus } from "@/utils/payments";
import { env } from "cloudflare:workers";

interface CreateOrderData {
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  items: string;
  preferredDate: string | null;
  notes: string | null;
}

function validateOrder(data: CreateOrderData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.contactName?.trim()) {
    errors.push("Please enter your name");
  }

  if (!data.items?.trim()) {
    errors.push("Please describe what you want to order");
  }

  if (data.items && data.items.length > 1000) {
    errors.push("Order description is too long (max 1000 characters)");
  }

  if (data.notes && data.notes.length > 500) {
    errors.push("Notes are too long (max 500 characters)");
  }

  return { valid: errors.length === 0, errors };
}

export async function createOrder(data: CreateOrderData) {
  const { ctx } = requestInfo;

  // Must be logged in
  if (!ctx.user) {
    return { success: false, error: "You must be logged in" };
  }

  // Must have organization context
  if (!ctx.currentOrganization) {
    return { success: false, error: "No organization context" };
  }

  // Validate input
  const validation = validateOrder(data);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('. ') };
  }

  try {
    // Update user profile if name/phone provided (for future orders)
    if (data.contactName !== ctx.user.username) {
      await db.user.update({
        where: { id: ctx.user.id },
        data: {
          name: data.contactName,
          phone: data.contactPhone
        }
      });
    }

    // Get next order number for this organization
    const lastOrder = await db.order.findFirst({
      where: { organizationId: ctx.currentOrganization.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });
    const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

    // Create order
    const order = await db.order.create({
      data: {
        userId: ctx.user.id,
        organizationId: ctx.currentOrganization.id,
        orderNumber: nextOrderNumber,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        items: data.items,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        notes: data.notes,
        status: 'pending'
      }
    });

    // Send confirmation email to customer (if they provided email)
    if (order.contactEmail) {
      try {
        await sendOrderConfirmationEmail({
          to: order.contactEmail,
          customerName: order.contactName,
          orderNumber: order.orderNumber,
          items: order.items,
          preferredDate: order.preferredDate?.toISOString(),
          notes: order.notes || undefined,
          businessName: ctx.currentOrganization.name,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
    }

    // Send notification email to admin
    if (env.ADMIN_EMAIL) {
      try {
        await sendAdminNewOrderEmail({
          to: env.ADMIN_EMAIL,
          orderNumber: order.orderNumber,
          customerName: order.contactName,
          customerEmail: order.contactEmail || undefined,
          customerPhone: order.contactPhone || undefined,
          items: order.items,
          preferredDate: order.preferredDate?.toISOString(),
          notes: order.notes || undefined,
          businessName: ctx.currentOrganization.name,
        });
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Don't fail the order creation if email fails
      }
    }


    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error('Failed to create order:', error);
    return { success: false, error: 'Failed to create order' };
  }
}

export async function updateOrder(orderId: string, data: Partial<CreateOrderData>) {
  const { ctx } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "You must be logged in" };
  }

  if (!ctx.currentOrganization) {
    return { success: false, error: "No organization context" };
  }

  try {
    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.currentOrganization.id }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Only owner can edit
    if (order.userId !== ctx.user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Only pending orders can be edited
    if (order.status !== 'pending') {
      return { success: false, error: "Only pending orders can be edited" };
    }

    // Update order
    await db.order.update({
      where: { id: orderId },
      data: {
        items: data.items ?? order.items,
        notes: data.notes ?? order.notes,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : order.preferredDate,
        contactName: data.contactName ?? order.contactName,
        contactPhone: data.contactPhone ?? order.contactPhone,
      }
    });


    return { success: true };
  } catch (error) {
    console.error('Failed to update order:', error);
    return { success: false, error: 'Failed to update order' };
  }
}

export async function createCheckoutSession(orderId: string, tipAmount?: number) {
  const { ctx, request } = requestInfo;

  if (!ctx.user) {
    return { success: false as const, error: "You must be logged in" };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            platformFeeBps: true,
            feeModel: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false as const, error: "Order not found" };
    }

    // Only owner can pay
    if (order.userId !== ctx.user.id) {
      return { success: false as const, error: "Not authorized" };
    }

    // Must be confirmed
    if (order.status !== "confirmed" && order.status !== "completed") {
      return { success: false as const, error: "Order must be confirmed before payment" };
    }

    // Check payment status
    const paymentStatus = getPaymentStatus(order);
    if (paymentStatus === "paid" || paymentStatus === "overpaid") {
      return { success: false as const, error: "Order is already fully paid" };
    }

    // Stripe must be connected
    const { stripeAccountId, stripeOnboardingComplete } = order.organization;
    const secretKey = (env as unknown as Record<string, string>).STRIPE_SECRET_KEY;

    if (!stripeAccountId || !stripeOnboardingComplete || !secretKey) {
      return { success: false as const, error: "Online payments are not available" };
    }

    // Determine checkout amount
    const totalDue = order.totalDue!;
    let checkoutAmount: number;
    let productName: string;

    if (paymentStatus === "unpaid" && order.depositAmount != null && order.depositAmount > 0) {
      // First payment with deposit: charge deposit
      checkoutAmount = order.depositAmount;
      productName = `Deposit for Order #${order.orderNumber}`;
    } else if (paymentStatus === "unpaid") {
      // No deposit: charge full amount
      checkoutAmount = totalDue;
      productName = `Order #${order.orderNumber}`;
    } else {
      // Partial/deposit paid: charge remaining
      checkoutAmount = totalDue - order.amountPaid;
      productName = `Remaining Balance for Order #${order.orderNumber}`;
    }

    // Scale platform fee proportionally to checkout amount
    const platformFee = order.platformFee ?? 0;
    const checkoutFee = Math.round(platformFee * checkoutAmount / totalDue);

    const stripe = getStripe(secretKey);
    const origin = new URL(request.url).origin;

    // Build line items — order amount + optional tip
    const lineItems: Array<{
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string };
      };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: "usd",
          unit_amount: checkoutAmount,
          product_data: { name: productName },
        },
        quantity: 1,
      },
    ];

    const MAX_TIP_CENTS = 50000; // $500
    const tipCents = (tipAmount && Number.isFinite(tipAmount) && tipAmount > 0)
      ? Math.min(Math.round(tipAmount), MAX_TIP_CENTS)
      : 0;
    if (tipCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: tipCents,
          product_data: { name: "Tip" },
        },
        quantity: 1,
      });
    }

    // application_fee excludes tip — only on order amount
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: checkoutFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          platform: "fresh-catch",
          orderId: order.id,
          orderNumber: String(order.orderNumber),
          orgId: order.organization.id,
          ...(tipCents > 0 ? { tipAmount: String(tipCents) } : {}),
        },
      },
      metadata: {
        platform: "fresh-catch",
        orderId: order.id,
        orderNumber: String(order.orderNumber),
        orgId: order.organization.id,
        ...(tipCents > 0 ? { tipAmount: String(tipCents) } : {}),
      },
      success_url: `${origin}/orders?checkout=success&order=${order.orderNumber}`,
      cancel_url: `${origin}/orders?checkout=cancel&order=${order.orderNumber}`,
    });

    // Store session ID on order
    await db.order.update({
      where: { id: orderId },
      data: { stripeCheckoutSessionId: session.id },
    });

    return { success: true as const, checkoutUrl: session.url };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return { success: false as const, error: "Failed to create checkout session" };
  }
}

export async function cancelOrder(orderId: string) {
  const { ctx } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    // Get order to verify ownership and status
    const order = await db.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Only owner can cancel
    if (order.userId !== ctx.user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Only pending orders can be cancelled
    if (order.status !== 'pending') {
      return { success: false, error: "Only pending orders can be cancelled" };
    }

    // Cancel order
    await db.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' }
    });


    return { success: true };
  } catch (error) {
    console.error('Failed to cancel order:', error);
    return { success: false, error: 'Failed to cancel order' };
  }
}
