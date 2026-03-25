import { useState, useEffect } from "react";

interface PaymentStatusBannerProps {
  status: "success" | "cancel" | null;
  orderNumber: number | null;
}

export function PaymentStatusBanner({ status, orderNumber }: PaymentStatusBannerProps) {
  const [visible, setVisible] = useState(!!status);

  useEffect(() => {
    if (!status) return;

    // Clean URL params immediately
    history.replaceState({}, "", "/orders");

    // Auto-dismiss after 5s
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible || !status) return null;

  const isSuccess = status === "success";

  return (
    <div
      style={{
        padding: "var(--space-sm) var(--space-md)",
        background: isSuccess ? "var(--color-status-success)" : "var(--color-status-warning-bg)",
        color: isSuccess ? "var(--color-text-inverse)" : "var(--color-text-primary)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-md)",
        fontWeight: 600,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "var(--space-lg)",
      }}
    >
      <span>
        {isSuccess
          ? "Payment received! Thank you."
          : "Payment cancelled. You can try again or pay at pickup."}
      </span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isSuccess ? "var(--color-text-inverse)" : "var(--color-text-primary)",
          fontSize: "var(--font-size-md)",
          padding: "var(--space-xs)",
        }}
      >
        ✕
      </button>
    </div>
  );
}
