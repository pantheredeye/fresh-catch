"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { sendOrderConfirmedEmail } from "@/utils/email";
import { calculatePlatformFee, type FeeModel } from "@/utils/money";

export async function confirmOrder(orderId: string, price: number, adminNotes: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        organization: {
          select: { name: true, platformFeeBps: true, feeModel: true },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status !== 'pending') {
      return { success: false, error: "Only pending orders can be confirmed" };
    }

    const { platformFeeBps, feeModel } = order.organization;
    const { customerTotal, platformFee } = calculatePlatformFee(
      price,
      platformFeeBps,
      feeModel as FeeModel,
    );

    await db.order.update({
      where: { id: orderId },
      data: {
        status: 'confirmed',
        price,
        platformFeeBps,
        platformFee,
        totalDue: customerTotal,
        adminNotes: adminNotes.trim() || null,
      },
    });

    // Send confirmed email to customer
    const customerEmail = order.contactEmail;
    if (customerEmail) {
      try {
        await sendOrderConfirmedEmail({
          to: customerEmail,
          customerName: order.contactName,
          orderNumber: order.orderNumber,
          items: order.items,
          price: String(price),
          adminNotes: adminNotes.trim() || undefined,
          preferredDate: order.preferredDate?.toISOString(),
          businessName: order.organization.name,
        });
      } catch (emailError) {
        console.error('Failed to send confirmed email:', emailError);
        // Don't fail the confirmation if email fails
      }
    }


    return { success: true };
  } catch (error) {
    console.error('Failed to confirm order:', error);
    return { success: false, error: 'Failed to confirm order' };
  }
}

export async function completeOrder(orderId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status !== 'confirmed') {
      return { success: false, error: "Only confirmed orders can be completed" };
    }

    await db.order.update({
      where: { id: orderId },
      data: { status: 'completed' }
    });


    return { success: true };
  } catch (error) {
    console.error('Failed to complete order:', error);
    return { success: false, error: 'Failed to complete order' };
  }
}

export async function cancelOrderAdmin(orderId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false, error: "Admin access required" };
  }

  try {
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

export async function markAsPaid(
  orderId: string,
  paymentMethod: string,
  paymentNotes?: string
) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: paymentMethod,
        paymentNotes: paymentNotes || null,
        paidAt: new Date()
      }
    });


    return { success: true };
  } catch (error) {
    console.error('Failed to mark as paid:', error);
    return { success: false, error: 'Failed to mark as paid' };
  }
}
