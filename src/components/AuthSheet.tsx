"use client";

import { useEffect } from "react";
import { AuthCard, AuthSuccess } from "@/app/pages/user/AuthCard";

/**
 * Bottom-sheet wrapper around the shared AuthCard — the reusable
 * account-creation/sign-in trigger. Hosts (order form, AI chat, nav) open it
 * at the moment auth is actually needed; on success it hands the fresh
 * csrfToken to onAuthed and closes WITHOUT navigating, so the host can run
 * its pending action (e.g. createOrder) and then decide where to go.
 */
export function AuthSheet({
  open,
  onClose,
  onAuthed,
  title = "Almost there",
  subtitle = "Enter your email and we'll send you a code. New here? Same two steps.",
  prefillEmail,
}: {
  open: boolean;
  onClose: () => void;
  onAuthed: (result: AuthSuccess) => void;
  title?: string;
  subtitle?: string;
  prefillEmail?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--color-surface-overlay)",
        backdropFilter: "blur(4px)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface-primary)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "85dvh",
          overflowY: "auto",
          padding: "var(--space-lg)",
          paddingBottom: "calc(var(--space-lg) + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-display)",
                margin: "0 0 var(--space-xs) 0",
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--font-size-xl)",
              color: "var(--color-text-secondary)",
              lineHeight: 1,
              padding: "var(--space-xs)",
            }}
          >
            ×
          </button>
        </div>
        <AuthCard prefillEmail={prefillEmail} onSuccess={onAuthed} />
      </div>
    </div>
  );
}
