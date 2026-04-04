"use client";

import { useState, useEffect, useMemo } from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  checkEmailExists,
  loginWithPassword,
  registerWithPassword,
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";
import { isBreachedPasswordLocal } from "@/utils/breached-passwords";

const BUSINESS_CONTEXT = "Fresh Catch Seafood Markets";

type Flow = "initial" | "login-password" | "login-passkey" | "register";

const linkStyle = {
  background: "none",
  border: "none",
  color: "var(--color-action-primary)",
  fontSize: "var(--font-size-sm)",
  textDecoration: "underline" as const,
  cursor: "pointer",
  fontFamily: "var(--font-display)",
};

export function Login({ ctx }: { ctx: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [flow, setFlow] = useState<Flow>("initial");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState("/");
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [bSlug, setBSlug] = useState<string | null>(null);

  // Capture ?b= param from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("b");
    if (b) setBSlug(b);
  }, []);

  const withBParam = (url: string) =>
    bSlug ? `${url}${url.includes("?") ? "&" : "?"}b=${bSlug}` : url;

  const disabled = status === "loading" || status === "success" || rateLimitCooldown > 0;

  const passwordFeedback = useMemo(() => {
    if (!password || flow !== "register") return null;
    if (password.length < 8) {
      return { text: `Too short (${password.length}/8 characters)`, color: "var(--color-status-error)" };
    }
    if (isBreachedPasswordLocal(password)) {
      return { text: "Too common — pick something less guessable", color: "var(--color-status-warning)" };
    }
    return { text: "Looks good", color: "var(--color-status-success)" };
  }, [password, flow]);

  const startRateLimitCooldown = (seconds: number) => {
    setRateLimitCooldown(seconds);
    setStatus("error");
    setMessage(`Too many attempts. Please wait ${seconds}s before trying again.`);
  };

  const handleContinue = async () => {
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email");
      return;
    }

    setStatus("loading");
    setMessage("Checking account...");

    try {
      const result = await checkEmailExists(email);

      if (result.rateLimited) {
        startRateLimitCooldown(result.retryAfterSeconds ?? 30);
        return;
      }

      if (result.exists) {
        if (result.hasPassword) {
          setFlow("login-password");
          setStatus("idle");
          setMessage("");
        } else {
          // Passkey-only user — trigger passkey flow directly
          setFlow("login-passkey");
          setStatus("idle");
          setMessage("");
          handlePasskeyLogin();
        }
      } else {
        setIsNewAccount(true);
        setFlow("register");
        setStatus("idle");
        setMessage("");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to check account. Please try again.");
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) {
      setStatus("error");
      setMessage("Please enter your password");
      return;
    }

    setStatus("loading");
    setMessage("Signing in...");

    try {
      const result = await loginWithPassword(email, password, rememberMe);

      if (result.rateLimited) {
        startRateLimitCooldown(result.retryAfterSeconds ?? 30);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Invalid email or password");
      }

      setFailedAttempts(0);
      const destination = withBParam(result.isAdmin ? "/admin" : "/");
      setRedirectUrl(destination);
      setStatus("success");
      setMessage("Welcome back! Redirecting...");
      setCountdown(2);
    } catch (error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setStatus("error");
      const base = error instanceof Error ? error.message : "Login failed. Please try again.";
      setMessage(attempts >= 3 ? `${base} You may want to wait a few minutes before trying again.` : base);
    }
  };

  const handlePasskeyLogin = async () => {
    setStatus("loading");
    setMessage("Authenticating with passkey...");

    try {
      const options = await startPasskeyLogin(email);
      const login = await startAuthentication({ optionsJSON: options });
      const result = await finishPasskeyLogin(login);

      if (!result || !result.success) {
        throw new Error("Passkey login failed.");
      }

      const destination = withBParam(result.isAdmin ? "/admin" : "/");
      setRedirectUrl(destination);
      setStatus("success");
      setMessage("Welcome back! Redirecting...");
      setCountdown(2);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Passkey login failed. Please try again.");
    }
  };

  const handlePasswordRegister = async () => {
    if (!password || password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords don't match");
      return;
    }

    setStatus("loading");
    setMessage("Creating your account...");

    try {
      const result = await registerWithPassword(email, password, rememberMe);

      if (result.rateLimited) {
        startRateLimitCooldown(result.retryAfterSeconds ?? 30);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Registration failed");
      }

      setRedirectUrl(withBParam("/"));
      setStatus("success");
      setMessage("Welcome to Fresh Catch! Redirecting...");
      setCountdown(2);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  // Countdown and redirect
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 1) {
          window.location.href = redirectUrl;
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, countdown, redirectUrl]);

  // Rate limit cooldown timer
  useEffect(() => {
    if (rateLimitCooldown > 0) {
      const timer = setTimeout(() => {
        const next = rateLimitCooldown - 1;
        setRateLimitCooldown(next);
        if (next === 0) {
          setStatus("idle");
          setMessage("");
        } else {
          setMessage(`Too many attempts. Please wait ${next}s before trying again.`);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCooldown]);

  const getStatusBg = () => {
    switch (status) {
      case "success": return "var(--color-status-success)";
      case "error": return "var(--color-action-secondary)";
      case "loading": return "var(--color-status-info-bg)";
      default: return "var(--color-text-tertiary)";
    }
  };

  const getStatusAccent = () => {
    switch (status) {
      case "loading": return "var(--color-status-info)";
      default: return undefined;
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case "error": return "var(--color-text-inverse)";
      default: return "var(--color-text-primary)";
    }
  };

  const heading =
    flow === "register"
      ? "Create Account"
      : flow === "login-password" || flow === "login-passkey"
      ? "Welcome Back"
      : "Welcome";

  const subtitle =
    flow === "register"
      ? `Create a new account with ${BUSINESS_CONTEXT}`
      : flow === "login-password" || flow === "login-passkey"
      ? `Sign in to ${BUSINESS_CONTEXT}`
      : "Sign in or create an account";

  const resetFlow = () => {
    setFlow("initial");
    setPassword("");
    setConfirmPassword("");
    setIsNewAccount(false);
    setStatus("idle");
    setMessage("");
    setFailedAttempts(0);
  };

  const rememberMeCheckbox = (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        style={{ width: 16, height: 16 }}
      />
      Remember me
    </label>
  );

  return (
    <Container size="sm" noPadding>
      <Card variant="centered" maxWidth="450px">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
          <h1 style={{
            fontSize: "var(--font-size-3xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            margin: "0 0 var(--space-xs) 0",
          }}>
            {heading}
          </h1>
          <p style={{
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-secondary)",
            margin: 0,
            lineHeight: "var(--line-height-base)",
          }}>
            {subtitle}
          </p>
        </div>

        {/* Register with password */}
        {flow === "register" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handlePasswordRegister(); }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
          >
            {isNewAccount && (
              <div style={{
                padding: "var(--space-sm) var(--space-md)",
                background: "var(--color-status-info-bg)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-primary)",
              }}>
                Creating account for <strong>{email}</strong>
              </div>
            )}
            <TextInput
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!email && disabled}
              required
              size="lg"
            />
            <div>
              <TextInput
                label="Password"
                type="password"
                name="new-password"
                autoComplete="new-password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={disabled}
                size="lg"
                autoFocus
              />
              {passwordFeedback && (
                <div style={{
                  fontSize: "var(--font-size-xs)",
                  color: passwordFeedback.color,
                  marginTop: "var(--space-xs)",
                  fontFamily: "var(--font-display)",
                }}>
                  {passwordFeedback.text}
                </div>
              )}
            </div>
            <TextInput
              label="Confirm Password"
              type="password"
              name="new-password-confirm"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={disabled}
              size="lg"
            />
            {rememberMeCheckbox}
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
              {status === "loading" ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        )}

        {/* Login with password */}
        {flow === "login-password" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handlePasswordLogin(); }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
          >
            <TextInput
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              disabled
              size="lg"
            />
            <TextInput
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
              size="lg"
              autoFocus
            />
            {rememberMeCheckbox}
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
              {status === "loading" ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        {/* Login with passkey (auto-triggered or manual) */}
        {flow === "login-passkey" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", textAlign: "center" }}>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
              Complete the passkey prompt from your browser...
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={handlePasskeyLogin} disabled={disabled}>
              {status === "loading" ? "Authenticating..." : "Retry Passkey"}
            </Button>
          </div>
        )}

        {/* Initial — email only */}
        {flow === "initial" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleContinue(); }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
          >
            <TextInput
              label="Email"
              type="email"
              name="email"
              autoComplete="email webauthn"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={disabled}
              size="lg"
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
              {status === "loading" ? "Checking..." : "Continue"}
            </Button>
          </form>
        )}

        {/* Secondary actions */}
        {flow === "login-password" && (
          <div style={{ marginTop: "var(--space-md)", textAlign: "center", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border-subtle)" }}>
            <button onClick={() => { setFlow("login-passkey"); handlePasskeyLogin(); }} disabled={disabled} style={linkStyle}>
              Use passkey instead
            </button>
          </div>
        )}

        {flow === "initial" && (
          <div style={{ marginTop: "var(--space-md)", textAlign: "center", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border-subtle)" }}>
            <button onClick={() => { setFlow("register"); }} disabled={disabled} style={linkStyle}>
              I want to create a new account
            </button>
          </div>
        )}

        {(flow === "register" || flow === "login-password" || flow === "login-passkey") && (
          <div style={{ marginTop: "var(--space-sm)", textAlign: "center" }}>
            <button onClick={resetFlow} disabled={disabled} style={linkStyle}>
              Back to sign in
            </button>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div style={{
            marginTop: "var(--space-md)",
            padding: "var(--space-md)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-xs)",
            background: getStatusBg(),
            color: getStatusTextColor(),
            border: `1px solid ${getStatusBg()}`,
            borderLeft: getStatusAccent() ? `3px solid ${getStatusAccent()}` : undefined,
          }}>
            {status === "loading" && (
              <div style={{
                width: "16px", height: "16px",
                border: "2px solid currentColor",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            )}
            <span>
              {message}
              {status === "success" && countdown > 0 && (
                <span
                  onClick={() => { window.location.href = redirectUrl; }}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.location.href = redirectUrl; }}
                >
                  {" "}Redirecting in {countdown}… tap to go now
                </span>
              )}
            </span>
          </div>
        )}

        {/* Success Link */}
        {status === "success" && (
          <div style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
            <a
              href={redirectUrl}
              style={{
                color: "var(--color-action-primary)",
                textDecoration: "none",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Go now →
            </a>
          </div>
        )}
      </Card>
    </Container>
  );
}
