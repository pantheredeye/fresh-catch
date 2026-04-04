"use client";

import { useState, useTransition } from "react";
import { Container, Card, Button } from "@/design-system";
import { acceptInvite } from "@/app/pages/admin/team/team-functions";

export function AcceptInviteUI({
  token,
  orgName,
  roleLabel,
  inviteEmail,
  csrfToken,
}: {
  token: string;
  orgName: string;
  roleLabel: string;
  inviteEmail: string | null;
  csrfToken: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvite(csrfToken, token);
      if (result.success) {
        setAccepted(true);
      } else {
        setError(result.error || "Failed to accept invite");
      }
    });
  };

  if (accepted) {
    return (
      <Container size="sm">
        <Card variant="centered" maxWidth="450px">
          <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-md)" }}>
              Welcome to {orgName}!
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-lg)" }}>
              You've joined as <strong>{roleLabel}</strong>.
            </p>
            <a
              href="/admin"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "var(--color-action-primary)",
                color: "var(--color-text-inverse)",
                textDecoration: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: "var(--font-weight-semibold)",
                fontSize: "var(--font-size-md)",
              }}
            >
              Go to Admin
            </a>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
          <h1 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-md)" }}>
            Join {orgName}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-lg)" }}>
            You've been invited to join as <strong>{roleLabel}</strong>.
          </p>
          {inviteEmail && (
            <p style={{ color: "var(--color-text-tertiary)", marginBottom: "var(--space-md)", fontSize: "var(--font-size-sm)" }}>
              Invite sent to: {inviteEmail}
            </p>
          )}
          {error && (
            <p style={{ color: "var(--color-status-error)", marginBottom: "var(--space-md)", fontSize: "var(--font-size-sm)" }}>
              {error}
            </p>
          )}
          <Button variant="primary" size="lg" onClick={handleAccept} disabled={isPending}>
            {isPending ? "Joining..." : "Accept Invite"}
          </Button>
        </div>
      </Card>
    </Container>
  );
}
