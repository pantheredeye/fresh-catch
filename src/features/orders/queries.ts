import { db } from "@/lib/db";
import type { FishRequest, Order, Payment } from "@/lib/db";
import type { PaymentMethod } from "./validation";

export type OrderWithPayments = Order & { payments: Payment[] };

function itemsSnapshot(request: FishRequest): string {
  return JSON.stringify({
    requestType: request.requestType,
    species: request.species,
    quantity: request.quantity,
    notes: request.notes,
  });
}

async function nextOrderNumber(): Promise<number> {
  const last = await db.order.findFirst({ orderBy: { orderNumber: "desc" } });
  return (last?.orderNumber ?? 0) + 1;
}

/**
 * Confirms a thread into a priced Order (issue #65). `orderNumber` is
 * `max + 1` with a single retry on the unique-constraint race — single-vendor
 * scale makes that sufficient (plan addendum). Also stamps
 * `FishRequest.quotedPriceCents` and flips status to `"confirmed"`; the
 * caller is responsible for posting the vendor quote message, same as any
 * other admin reply.
 */
export async function confirmOrderForRequest(
  request: FishRequest,
  data: { priceCents: number; depositCents: number | null; adminNotes: string | null },
): Promise<Order> {
  const items = itemsSnapshot(request);
  const createWith = (orderNumber: number) =>
    db.order.create({
      data: {
        orderNumber,
        userId: request.userId,
        requestId: request.id,
        contactName: request.contactName,
        contactEmail: request.contactEmail,
        contactPhone: request.contactPhone,
        items,
        status: "confirmed",
        price: data.priceCents,
        totalDue: data.priceCents,
        depositAmount: data.depositCents,
        adminNotes: data.adminNotes,
      },
    });

  let order: Order;
  try {
    order = await createWith(await nextOrderNumber());
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("UNIQUE")) throw err;
    order = await createWith(await nextOrderNumber());
  }

  await db.fishRequest.update({
    where: { id: request.id },
    data: { quotedPriceCents: data.priceCents, status: "confirmed" },
  });

  return order;
}

export function getOrderWithPayments(orderId: string): Promise<OrderWithPayments | null> {
  return db.order.findUnique({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: "desc" } } } });
}

/** `Payment.method` as stored: the in-person methods #65 offers, plus Stripe (#60). */
export type PaymentRecordMethod = PaymentMethod | "stripe";

/** `Payment.type` for money coming in. Refunds go through `recordRefund`. */
export type PaymentType = "deposit" | "payment";

/**
 * Records a `Payment` ledger row and bumps `Order.amountPaid`, stamping
 * `paidAt` once the running total meets `totalDue`.
 *
 * Written for mark-paid-in-person (#65) and extended in #60 for Stripe: the
 * ledger arithmetic is identical either way, only the provenance fields
 * differ. `db.$transaction(cb)` is unavailable on the D1 adapter, hence the
 * sequential awaits.
 */
export async function recordPayment(
  order: Order,
  data: {
    amountCents: number;
    method: PaymentRecordMethod;
    notes: string | null;
    type?: PaymentType;
    stripePaymentId?: string | null;
    stripePaymentIntentId?: string | null;
  },
): Promise<{ order: Order; payment: Payment }> {
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      amount: data.amountCents,
      method: data.method,
      type: data.type ?? "payment",
      notes: data.notes,
      stripePaymentId: data.stripePaymentId ?? null,
    },
  });

  const amountPaid = order.amountPaid + data.amountCents;
  const fullyPaid = order.totalDue != null && amountPaid >= order.totalDue;
  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      amountPaid,
      ...(data.stripePaymentIntentId ? { stripePaymentIntentId: data.stripePaymentIntentId } : {}),
      ...(fullyPaid && !order.paidAt ? { paidAt: new Date() } : {}),
    },
  });

  return { order: updated, payment };
}

/**
 * The mirror image: a negative ledger row that walks `amountPaid` back down
 * and clears `paidAt` when the order is no longer covered.
 */
export async function recordRefund(
  order: Order,
  data: { amountCents: number; method?: PaymentRecordMethod; stripePaymentId?: string | null; notes?: string | null },
): Promise<{ order: Order; payment: Payment }> {
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      amount: -data.amountCents,
      method: data.method ?? "stripe",
      type: "refund",
      notes: data.notes ?? null,
      stripePaymentId: data.stripePaymentId ?? null,
    },
  });

  const amountPaid = order.amountPaid - data.amountCents;
  const stillFullyPaid = order.totalDue != null && amountPaid >= order.totalDue;
  const updated = await db.order.update({
    where: { id: order.id },
    data: { amountPaid, ...(order.paidAt && !stillFullyPaid ? { paidAt: null } : {}) },
  });

  return { order: updated, payment };
}
