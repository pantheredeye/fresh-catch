"use client";

import { useState, useTransition } from "react";
import { Button } from "@/design-system";
import { updateNotificationEmail } from "./notification-functions";
import "./admin.css";

export function NotificationSettingsUI({
  orgId,
  orgName,
  notificationEmail,
  csrfToken,
}: {
  orgId: string;
  orgName: string;
  notificationEmail: string | null;
  csrfToken: string;
}) {
  const [email, setEmail] = useState(notificationEmail ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateNotificationEmail(
        csrfToken,
        orgId,
        email.trim() || null
      );
      if (result.success) {
        setMessage("Notification email saved");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: "var(--width-sm)", margin: "0 auto", padding: "var(--space-lg)" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-sm)", color: "var(--color-text-primary)" }}>
        Notifications
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-lg)" }}>
        Choose where new-order notifications for {orgName} are sent
      </p>

      <div style={{
        background: "var(--color-surface-primary)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-md)",
        border: "1px solid var(--color-border-light)",
      }}>
        <label style={{
          display: "block",
          marginBottom: "var(--space-xs)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
        }}>
          Notification email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="orders@yourbusiness.com"
          style={{
            width: "100%",
            padding: "var(--space-sm)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-input)",
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-md)",
            boxSizing: "border-box",
          }}
        />
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-md)" }}>
          Leave blank to fall back to the account owner's email.
        </p>

        <div style={{ width: "100%" }}>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {message && (
          <div style={{
            marginTop: "var(--space-sm)",
            padding: "var(--space-xs)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-status-success-bg)",
            color: "var(--color-status-success-border)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
          }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{
            marginTop: "var(--space-sm)",
            padding: "var(--space-xs)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-status-error-bg)",
            color: "var(--color-status-error)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
