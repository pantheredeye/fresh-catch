"use client";

import { useState, type FormEvent } from "react";
import { saveCustomerEmail } from "@/chat/functions";

interface EmailPromptBubbleProps {
  conversationId: string;
  vendorName: string;
  onDismiss: () => void;
  onSubmitted: (email: string) => void;
}

export function EmailPromptBubble({
  conversationId,
  vendorName,
  onDismiss,
  onSubmitted,
}: EmailPromptBubbleProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await saveCustomerEmail(conversationId, trimmed);
    setLoading(false);

    if (result.success) {
      onSubmitted(trimmed);
    } else {
      setError(result.error ?? "Something went wrong");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "var(--space-md)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-secondary)",
          color: "var(--color-text-primary)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-md)",
            lineHeight: "var(--line-height-base)",
            marginBottom: "var(--space-sm)",
          }}
        >
          Want {vendorName} to email you when they reply?
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
            style={{
              fontSize: "var(--font-size-md)",
              padding: "var(--space-xs) var(--space-sm)",
              border: error
                ? "1px solid var(--color-status-error)"
                : "1px solid var(--color-border-input)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-primary)",
              color: "var(--color-text-primary)",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            aria-label="Email address"
          />

          {error && (
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-status-error)",
              }}
            >
              {error}
            </span>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: loading
                ? "var(--color-surface-secondary)"
                : "var(--color-action-primary)",
              color: "var(--color-text-inverse)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)" as any,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Saving..." : "Notify me"}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              padding: "var(--space-xs) 0 0",
              fontFamily: "inherit",
              textAlign: "center",
            }}
          >
            No thanks
          </button>
        </form>
      </div>
    </div>
  );
}
