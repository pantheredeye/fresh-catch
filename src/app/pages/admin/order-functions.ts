"use server";

import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { sendOrderConfirmedEmail } from "@/utils/email";
import { calculatePlatformFee, type FeeModel } from "@/utils/money";
import { getStripe } from "@/utils/stripe";

export async function confirmOrder(orderId: string, price: number, adminNotes: string) {
  const { ctx, request } = requestInfo;

  if (!hasAdminAccess(ctx)) {
    return { success: false, error: "Admin access required" };
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

    // Create Stripe Checkout session if org has Stripe connected
    const { stripeAccountId, stripeOnboardingComplete } = order.organization;
    const secretKey = (env as unknown as Record<string, string>).STRIPE_SECRET_KEY;

    if (stripeAccountId && stripeOnboardingComplete && secretKey) {
      try {
        const stripe = getStripe(secretKey);
        const origin = new URL(request.url).origin;

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: customerTotal,
                product_data: {
                  name: `Order #${order.orderNumber}`,
                },
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: platformFee,
            transfer_data: {
              destination: stripeAccountId,
            },
            metadata: {
              platform: "fresh-catch",
              orderId: order.id,
              orderNumber: order.orderNumber,
              orgId: order.organization.id,
            },
          },
          metadata: {
            platform: "fresh-catch",
            orderId: order.id,
            orderNumber: order.orderNumber,
            orgId: order.organization.id,
          },
          success_url: `${origin}/orders?checkout=success&order=${order.orderNumber}`,
          cancel_url: `${origin}/orders?checkout=cancel&order=${order.orderNumber}`,
        });

        await db.order.update({
          where: { id: orderId },
          data: { stripeCheckoutSessionId: session.id },
        });
      } catch (stripeError) {
        console.error('Failed to create Stripe checkout session:', stripeError);
        // Don't fail the confirmation if Stripe session creation fails
      }
    }

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
