"use client";

import { useState } from "react";
import { Container, Card, Button } from "@/design-system";
import { AuthSheet } from "@/components/AuthSheet";

/**
 * Post-checkout confirmation for an unauthenticated guest. No DB lookup, no
 * PII, no order number resolution — order numbers are sequential per org, so
 * a URL-supplied number must never be resolved for an unauthenticated caller.
 * Persistent (does not auto-dismiss) unlike PaymentStatusBanner.
 */
export function GuestOrderConfirmation({ status }: { status: "success" | "cancel" }) {
  const [authOpen, setAuthOpen] = useState(false);

  const headline =
    status === "success" ? "Payment received! Thank you." : "Payment cancelled.";
  const body =
    status === "success"
      ? "We've emailed your order details. Sign in with the same email address to track it."
      : "No charge was made. You can pay from the link in your confirmation email, or sign in below to track your order.";

  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)", textAlign: "center" }}>
          <h1 className="text-heading-lg">{headline}</h1>
          <p className="text-subheading">{body}</p>
          <Button variant="primary" size="lg" fullWidth onClick={() => setAuthOpen(true)}>
            Sign in
          </Button>
        </div>
      </Card>

      <AuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => { window.location.href = "/orders"; }}
        title="Sign in to track your order"
        subtitle="Verify your email and we'll link your order to your account."
      />
    </Container>
  );
}
