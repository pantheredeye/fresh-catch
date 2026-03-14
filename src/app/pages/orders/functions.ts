"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/utils/email";
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
        status: 'pending',
        paymentStatus: 'unpaid'
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

  try {
    const order = await db.order.findUnique({
      where: { id: orderId }
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
