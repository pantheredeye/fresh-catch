"use client";

import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  justRegisteredPassword: "fresh-catch-just-registered-password",
  nudgeDismissCount: "fresh-catch-passkey-nudge-dismiss-count",
  nudgeDismissedSession: "fresh-catch-passkey-nudge-dismissed-session",
  hasPasskey: "fresh-catch-has-passkey",
};

/**
 * PasskeyNudge - suggests passkey addition after password registration.
 *
 * Visibility rules:
 * - Only shows if user just registered with password (localStorage marker)
 * - Hidden if user already has a passkey
 * - Dismissable; gone for the session
 * - Re-appears next session if dismissed fewer than 2 times total
 */
export function PasskeyNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // Don't show if user has a passkey
      if (localStorage.getItem(STORAGE_KEYS.hasPasskey) === "true") return;

      // Only show if user registered with password
      if (localStorage.getItem(STORAGE_KEYS.justRegisteredPassword) !== "true") return;

      // Don't show if already dismissed this session
      if (sessionStorage.getItem(STORAGE_KEYS.nudgeDismissedSession) === "true") return;

      // Don't show if dismissed 2+ times total
      const dismissCount = parseInt(
        localStorage.getItem(STORAGE_KEYS.nudgeDismissCount) ?? "0",
        10
      );
      if (dismissCount >= 2) return;

      setVisible(true);
    } catch {
      // localStorage/sessionStorage unavailable
    }
  }, []);

  const dismiss = () => {
    try {
      const prev = parseInt(
        localStorage.getItem(STORAGE_KEYS.nudgeDismissCount) ?? "0",
        10
      );
      localStorage.setItem(STORAGE_KEYS.nudgeDismissCount, String(prev + 1));
      sessionStorage.setItem(STORAGE_KEYS.nudgeDismissedSession, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "0 var(--space-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          background: "var(--color-status-info-bg)",
          border: "1px solid var(--color-status-info)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xl)", flexShrink: 0 }}>
          🔑
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Add a passkey for faster sign-in
          </div>
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-base)",
              marginBottom: "var(--space-sm)",
            }}
          >
            Use Face ID, fingerprint, or your device to sign in instantly — no
            password needed.
          </div>
          <a
            href="/profile"
            style={{
              display: "inline-block",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-action-primary)",
              textDecoration: "none",
            }}
          >
            Set up passkey →
          </a>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss passkey suggestion"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "var(--space-xs)",
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-tertiary)",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
