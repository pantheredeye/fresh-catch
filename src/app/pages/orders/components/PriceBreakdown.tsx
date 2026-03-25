"use client";

import { formatCents, type FeeModel } from "@/utils/money";

interface PriceBreakdownProps {
  price: number | null;
  platformFee: number | null;
  tipAmount: number | null;
  totalDue: number | null;
  feeModel: FeeModel | null;
}

export function PriceBreakdown({
  price,
  platformFee,
  tipAmount,
  totalDue,
  feeModel,
}: PriceBreakdownProps) {
  if (price == null && totalDue == null) {
    return (
      <div style={{
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-surface-secondary)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-tertiary)",
        textAlign: "center",
      }}>
        Price pending
      </div>
    );
  }

  const showFee = platformFee != null && platformFee > 0 && feeModel !== "vendor";
  const showTip = tipAmount != null && tipAmount > 0;
  const displayTotal = totalDue ?? price ?? 0;
  const finalTotal = displayTotal + (showTip ? tipAmount : 0);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xs)",
      fontSize: "var(--font-size-sm)",
      color: "var(--color-text-secondary)",
    }}>
      {price != null && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Items</span>
          <span>{formatCents(price)}</span>
        </div>
      )}

      {showFee && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Platform fee</span>
          <span>{formatCents(platformFee)}</span>
        </div>
      )}

      {showTip && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tip</span>
          <span>{formatCents(tipAmount)}</span>
        </div>
      )}

      <div style={{
        borderTop: "1px solid var(--color-border-subtle)",
        marginTop: "var(--space-xs)",
        paddingTop: "var(--space-xs)",
        display: "flex",
        justifyContent: "space-between",
        fontWeight: "var(--font-weight-bold)",
        fontSize: "var(--font-size-md)",
        color: "var(--color-text-primary)",
      }}>
        <span>Total</span>
        <span>{formatCents(finalTotal)}</span>
      </div>
    </div>
  );
}
