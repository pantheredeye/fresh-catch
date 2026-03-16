"use client";

import { useTransition } from "react";
import { Button } from "@/design-system";
import { getPaymentStatus } from "@/utils/payments";
import { formatCents } from "@/utils/money";

type OrderPaymentFields = {
  totalDue: number | null;
  amountPaid: number;
  depositAmount?: number | null;
};

interface PaymentActionsProps {
  order: OrderPaymentFields;
  tipAmount: number;
  onPay: (amountCents: number) => Promise<void>;
}

export function PaymentActions({ order, tipAmount, onPay }: PaymentActionsProps) {
  const [isPending, startTransition] = useTransition();
  const status = getPaymentStatus(order);

  // Unconfirmed (no price set) — show nothing
  if (status === null) return null;

  // Paid — green checkmark
  if (status === "paid" || status === "overpaid") {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-status-success)",
        borderRadius: "var(--radius-md)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-primary)",
      }}>
        <span style={{ fontSize: "var(--font-size-lg)" }}>✓</span>
        <span>Payment Complete</span>
      </div>
    );
  }

  const totalWithTip = (order.totalDue ?? 0) + tipAmount;
  const remaining = totalWithTip - order.amountPaid;

  const handlePay = (amount: number) => {
    startTransition(async () => {
      await onPay(amount);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {status === "unpaid" && !order.depositAmount && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={isPending}
          onClick={() => handlePay(totalWithTip)}
        >
          {isPending ? "Processing..." : `Pay ${formatCents(totalWithTip)}`}
        </Button>
      )}

      {status === "unpaid" && order.depositAmount != null && order.depositAmount > 0 && (
        <>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPending}
            onClick={() => handlePay(order.depositAmount!)}
          >
            {isPending ? "Processing..." : `Pay Deposit ${formatCents(order.depositAmount!)}`}
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            disabled={isPending}
            onClick={() => handlePay(totalWithTip)}
          >
            {isPending ? "Processing..." : `Pay Full ${formatCents(totalWithTip)}`}
          </Button>
        </>
      )}

      {(status === "partial" || status === "deposit") && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={isPending}
          onClick={() => handlePay(remaining)}
        >
          {isPending ? "Processing..." : `Pay Remaining ${formatCents(remaining)}`}
        </Button>
      )}

      <div style={{
        textAlign: "center",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
      }}>
        or pay at pickup
      </div>
    </div>
  );
}
