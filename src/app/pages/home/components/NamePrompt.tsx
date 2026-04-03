"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { createConversation } from "@/chat/functions";

function getStorageKey(organizationId: string) {
  return `fresh-catch-chat-${organizationId}`;
}

export function getStoredConversationId(organizationId: string): string | null {
  try {
    return localStorage.getItem(getStorageKey(organizationId));
  } catch {
    return null;
  }
}

function storeConversationId(organizationId: string, conversationId: string) {
  try {
    localStorage.setItem(getStorageKey(organizationId), conversationId);
  } catch {
    // localStorage unavailable
  }
}

interface NamePromptProps {
  organizationId: string;
  onConversationCreated: (conversationId: string) => void;
  /** If provided, skip prompt and auto-create conversation */
  autoCreateUser?: { name: string; phone?: string } | null;
}

export function NamePrompt({
  organizationId,
  onConversationCreated,
  autoCreateUser,
}: NamePromptProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-create for logged-in users
  useEffect(() => {
    if (!autoCreateUser) return;
    let cancelled = false;

    async function autoCreate() {
      try {
        const result = await createConversation({
          customerName: autoCreateUser!.name,
          customerPhone: autoCreateUser!.phone,
          organizationId,
        });
        if (cancelled) return;
        storeConversationId(organizationId, result.conversationId);
        onConversationCreated(result.conversationId);
      } catch {
        if (!cancelled) setError("Failed to start chat. Please try again.");
      }
    }

    autoCreate();
    return () => { cancelled = true; };
  }, [autoCreateUser, organizationId, onConversationCreated]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const result = await createConversation({
          customerName: trimmedName,
          customerPhone: phone.trim() || undefined,
          organizationId,
        });
        storeConversationId(organizationId, result.conversationId);
        onConversationCreated(result.conversationId);
      } catch {
        setError("Failed to start chat. Please try again.");
        setSubmitting(false);
      }
    },
    [name, phone, submitting, organizationId, onConversationCreated],
  );

  // If auto-creating, show loading state
  if (autoCreateUser) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-xl)",
        }}
      >
        <p
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-lg)",
            margin: 0,
          }}
        >
          Starting chat...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "var(--space-xl) var(--space-md)",
        gap: "var(--space-md)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3
          style={{
            margin: "0 0 var(--space-xs)",
            fontSize: "var(--font-size-xl)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Start a conversation
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          Enter your name to get started
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        <label
          htmlFor="chat-name"
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
          }}
        >
          Name *
        </label>
        <input
          id="chat-name"
          type="text"
          required
          autoFocus
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            minHeight: 52,
            fontSize: "var(--font-size-lg)",
            padding: "var(--space-sm) var(--space-md)",
            border: "1px solid var(--color-border-input)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-primary)",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        <label
          htmlFor="chat-phone"
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            marginTop: "var(--space-xs)",
          }}
        >
          Phone (optional)
        </label>
        <input
          id="chat-phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            minHeight: 52,
            fontSize: "var(--font-size-lg)",
            padding: "var(--space-sm) var(--space-md)",
            border: "1px solid var(--color-border-input)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-primary)",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              color: "var(--color-status-error)",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          style={{
            marginTop: "var(--space-sm)",
            minHeight: 52,
            fontSize: "var(--font-size-lg)",
            fontWeight: 600,
            fontFamily: "inherit",
            border: "none",
            borderRadius: "var(--radius-md)",
            background:
              name.trim() && !submitting
                ? "var(--color-action-primary)"
                : "var(--color-surface-secondary)",
            color:
              name.trim() && !submitting
                ? "var(--color-text-inverse)"
                : "var(--color-text-tertiary)",
            cursor: name.trim() && !submitting ? "pointer" : "default",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {submitting ? "Starting..." : "Start Chat"}
        </button>
      </form>
    </div>
  );
}
