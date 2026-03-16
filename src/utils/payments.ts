/**
 * Payment status utilities — derived from order pricing fields
 */

export type PaymentStatus =
  | "unpaid"
  | "deposit"
  | "partial"
  | "paid"
  | "overpaid";

interface OrderPaymentFields {
  totalDue: number | null;
  amountPaid: number;
  depositAmount?: number | null;
}

/**
 * Derive payment status from order pricing fields.
 * Returns null if totalDue is not set (price not yet assigned).
 */
export function getPaymentStatus(
  order: OrderPaymentFields,
): PaymentStatus | null {
  if (order.totalDue == null) return null;

  if (order.amountPaid <= 0) return "unpaid";

  if (order.amountPaid >= order.totalDue) {
    return order.amountPaid > order.totalDue ? "overpaid" : "paid";
  }

  // Partial payment — check if it's a deposit
  if (order.depositAmount != null && order.amountPaid <= order.depositAmount) {
    return "deposit";
  }

  return "partial";
}
