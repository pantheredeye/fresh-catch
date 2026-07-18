"use client";

import { useState, useEffect, useRef } from "react";
import { requestOtp, sendOtpForEmail, verifyOtp } from "./functions";
import { TextInput, Button } from "@/design-system";

export interface AuthSuccess {
  csrfToken: string;
  redirectTo: string;
  isAdmin: boolean;
  inviteAccepted?: boolean;
  inviteOrgName?: string;
}

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-action-primary)",
  fontSize: "var(--font-size-sm)",
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: "var(--font-display)",
  padding: 0,
};

const disabledLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "var(--color-text-tertiary)",
  cursor: "default",
  textDecoration: "none",
};

const errorStyle: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-status-error)",
  margin: 0,
};

function getEmailAction(email: string): { label: string; url: string } | null {
  const domain = email.split("@")[1]?.toLowerCase();
  switch (domain) {
    case "gmail.com":
      return { label: "Open Gmail", url: "https://mail.google.com" };
    case "outlook.com":
    case "hotmail.com":
    case "live.com":
      return { label: "Open Outlook", url: "https://outlook.live.com" };
    case "yahoo.com":
      return { label: "Open Yahoo Mail", url: "https://mail.yahoo.com" };
    case "icloud.com":
      return { label: "Open iCloud Mail", url: "https://www.icloud.com/mail" };
    case "proton.me":
    case "protonmail.com":
      return { label: "Open Proton Mail", url: "https://mail.proton.me" };
    case "aol.com":
      return { label: "Open AOL Mail", url: "https://mail.aol.com" };
    default:
      return null;
  }
}

/**
 * The one shared email → code login flow. Used by the /login page, the
 * invite page, and AuthSheet. Does NOT navigate on success — it calls
 * onSuccess with the fresh csrfToken + server-computed redirect and lets
 * the host decide (hard navigation or reload; never in-place RSC state,
 * since the auth cookie just changed).
 */
export function AuthCard({
  inviteToken,
  prefillEmail,
  onSuccess,
}: {
  inviteToken?: string | null;
  prefillEmail?: string;
  onSuccess: (result: AuthSuccess) => void;
}) {
  const [screen, setScreen] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // Prefill remembered email
  useEffect(() => {
    if (!prefillEmail) {
      try {
        const saved = localStorage.getItem("fc_email");
        if (saved) setEmail(saved);
      } catch {}
    }
  }, [prefillEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (screen === "code") codeRef.current?.focus();
  }, [screen]);

  const handleEmailSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await requestOtp(trimmed);
      if (!result.success) {
        if ("rateLimited" in result && result.rateLimited) {
          setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
        } else {
          setError(("error" in result && result.error) || "Something went wrong");
        }
        setLoading(false);
        return;
      }
      setLoading(false);
      setCode("");
      setResendCooldown(30);
      setScreen("code");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const submitCode = async (fullCode: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await verifyOtp(email.trim(), fullCode, inviteToken ?? undefined);
      if (!result.success) {
        if ("rateLimited" in result && result.rateLimited) {
          setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
        } else {
          setError(("error" in result && result.error) || "Invalid code");
        }
        setCode("");
        setLoading(false);
        submittingRef.current = false;
        codeRef.current?.focus();
        return;
      }
      try {
        localStorage.setItem("fc_email", email.trim());
      } catch {}
      // Keep loading state on — host navigates next
      onSuccess(result as AuthSuccess);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6) submitCode(cleaned);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    try {
      const result = await sendOtpForEmail(email.trim());
      if (!result.success) {
        if ("rateLimited" in result && result.rateLimited) {
          setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
        } else {
          setError(("error" in result && result.error) || "Couldn't resend. Try again.");
        }
        return;
      }
      setCode("");
      setResendCooldown(30);
      codeRef.current?.focus();
    } catch {
      setError("Couldn't resend. Try again.");
    }
  };

  const emailAction = getEmailAction(email);

  if (screen === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleEmailSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
      >
        <TextInput
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          disabled={loading}
        />
        {error && <p style={errorStyle}>{error}</p>}
        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Sending code…" : "Continue with email"}
        </Button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <p
        style={{
          fontSize: "var(--font-size-md)",
          color: "var(--color-text-secondary)",
          margin: 0,
        }}
      >
        We sent a 6-digit code to <strong>{email.trim()}</strong>.
      </p>
      <TextInput
        ref={codeRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCodeChange(e.target.value)}
        placeholder="123456"
        maxLength={6}
        disabled={loading}
        style={{
          fontSize: "var(--font-size-2xl)",
          letterSpacing: "0.5em",
          textAlign: "center",
          fontFamily: "monospace",
        }}
      />
      {error && <p style={errorStyle}>{error}</p>}
      {loading && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
          Checking…
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={handleResend} style={resendCooldown > 0 ? disabledLinkStyle : linkStyle}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
        {emailAction && (
          <a href={emailAction.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {emailAction.label}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setScreen("email");
          setCode("");
          setError("");
        }}
        style={{ ...linkStyle, alignSelf: "flex-start" }}
      >
        Use a different email
      </button>
    </div>
  );
}
