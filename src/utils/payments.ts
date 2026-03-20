/**
 * Payment status utilities — derived from order pricing fields.
 *
 * Order pricing lifecycle:
 *   1. Order created (pending): price/totalDue/platformFee all null, amountPaid=0
 *   2. Admin confirms: price, totalDue, platformFee set; depositAmount optional
 *   3. Payments recorded: amountPaid incremented; paidAt set when fully paid
 *   4. Order completed/cancelled: pricing fields frozen
 *
 * Valid field combinations:
 *   - totalDue=null → price not yet set (pending), status returns null
 *   - totalDue>=0, amountPaid=0 → "unpaid"
 *   - totalDue>0, 0 < amountPaid <= depositAmount → "deposit"
 *   - totalDue>0, amountPaid < totalDue (above deposit) → "partial"
 *   - totalDue>0, amountPaid == totalDue → "paid"
 *   - totalDue>0, amountPaid > totalDue → "overpaid"
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
