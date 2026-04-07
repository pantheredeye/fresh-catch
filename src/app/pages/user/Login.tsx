"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  requestOtp,
  verifyOtp,
  updateName,
  startPasskeyLogin,
  finishPasskeyLogin,
  startPasskeyRegistration,
  finishPasskeyRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

type Screen = "email" | "otp" | "passkey-prompt" | "name" | "passkey-nudge" | "success";

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

const headingStyle: React.CSSProperties = {
  fontSize: "var(--font-size-3xl)",
  fontWeight: "var(--font-weight-bold)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-display)",
  margin: "0 0 var(--space-xs) 0",
};

const subtextStyle: React.CSSProperties = {
  fontSize: "var(--font-size-md)",
  color: "var(--color-text-secondary)",
  margin: 0,
};

const errorStyle: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-status-error)",
  marginTop: "calc(-1 * var(--space-xs))",
};

function getEmailAction(email: string): { label: string; url: string } {
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
    default:
      return { label: "Open Email", url: "mailto:" };
  }
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        border: "2px solid transparent",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        verticalAlign: "middle",
        marginRight: "var(--space-xs)",
      }}
    />
  );
}

export function Login({ ctx, csrfToken = "" }: { ctx: any; csrfToken?: string }) {
  const [email, setEmail] = useState("");
  const [screen, setScreen] = useState<Screen>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState("/");
  const [countdown, setCountdown] = useState(0);
  const [bSlug, setBSlug] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [passkeyDismissed, setPasskeyDismissed] = useState(false);
  const [passkeyNudgeError, setPasskeyNudgeError] = useState(false);

  // OTP digit state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Capture URL params: ?b=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("b");
    if (b) setBSlug(b);
  }, []);

  const withBParam = (url: string) =>
    bSlug ? `${url}${url.includes("?") ? "&" : "?"}b=${bSlug}` : url;

  const disabled = loading || screen === "success" || rateLimitCooldown > 0;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Rate limit cooldown timer
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    setError(`Too many attempts. Wait ${rateLimitCooldown}s.`);
    const timer = setTimeout(() => {
      const next = rateLimitCooldown - 1;
      setRateLimitCooldown(next);
      if (next === 0) setError("");
    }, 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCooldown]);

  // Redirect countdown on success screen
  useEffect(() => {
    if (screen !== "success" || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        window.location.href = redirectUrl;
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [screen, countdown, redirectUrl]);

  // Auto-trigger passkey authentication on mount
  const passkeyTriggered = useRef(false);
  useEffect(() => {
    if (screen !== "passkey-prompt" || passkeyTriggered.current || passkeyDismissed) return;
    passkeyTriggered.current = true;
    handlePasskeyLogin();
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps


  const fillDigits = (code: string) => {
    const chars = code.replace(/\D/g, "").slice(0, 6).split("");
    const newDigits = Array(6).fill("").map((_, i) => chars[i] || "");
    setDigits(newDigits);
    const focusIdx = Math.min(chars.length, 5);
    digitRefs.current[focusIdx]?.focus();
  };

  // Navigate to success screen
  const goToSuccess = (admin: boolean) => {
    const destination = withBParam(admin ? "/admin" : "/");
    setRedirectUrl(destination);
    setScreen("success");
    setCountdown(2);
  };

  // Determine next screen after OTP verification
  const navigateAfterOtp = (result: { isAdmin: boolean; needsName?: boolean; hasPasskey?: boolean }) => {
    setIsAdmin(result.isAdmin);
    setNeedsName(result.needsName ?? false);
    setHasPasskey(result.hasPasskey ?? false);

    if (result.needsName) {
      setScreen("name");
    } else if (!result.hasPasskey) {
      setScreen("passkey-nudge");
    } else {
      goToSuccess(result.isAdmin);
    }
  };

  const submitOtp = useCallback(async (code: string) => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await verifyOtp(code);

      if (result.rateLimited) {
        setRateLimitCooldown(result.retryAfterSeconds ?? 30);
        setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(result.error || "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        digitRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      setLoading(false);
      navigateAfterOtp({
        isAdmin: result.isAdmin!,
        needsName: result.needsName,
        hasPasskey: result.hasPasskey,
      });
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }, [loading, bSlug]); // eslint-disable-line react-hooks/exhaustive-deps

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

      if (result.rateLimited) {
        setRateLimitCooldown(result.retryAfterSeconds ?? 30);
        setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setHint(result.hint);

      if (result.hint === "passkey") {
        setScreen("passkey-prompt");
      } else {
        setScreen("otp");
        setResendCooldown(30);
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      }

      setLoading(false);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || disabled) return;
    setLoading(true);
    setError("");

    try {
      const result = await requestOtp(email.trim());
      if (result.rateLimited) {
        setRateLimitCooldown(result.retryAfterSeconds ?? 30);
        setError(`Too many attempts. Wait ${result.retryAfterSeconds ?? 30}s.`);
      }
      setResendCooldown(30);
      setDigits(["", "", "", "", "", ""]);
      digitRefs.current[0]?.focus();
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const options = await startPasskeyLogin(email.trim());
      const authResponse = await startAuthentication({ optionsJSON: options });
      const result = await finishPasskeyLogin(authResponse);

      if (result && typeof result === "object" && result.success) {
        setLoading(false);
        goToSuccess(result.isAdmin);
      } else {
        setPasskeyDismissed(true);
        setError("Verification failed. Try the code instead.");
        setLoading(false);
      }
    } catch {
      setPasskeyDismissed(true);
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const handlePasskeyPromptFallback = () => {
    setScreen("otp");
    setResendCooldown(30);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    setTimeout(() => digitRefs.current[0]?.focus(), 50);
  };

  const handleNameSubmit = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await updateName(csrfToken, trimmed);

      if (!result.success) {
        setError(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setLoading(false);
      if (!hasPasskey) {
        setScreen("passkey-nudge");
      } else {
        goToSuccess(isAdmin);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const handlePasskeySetup = async () => {
    setLoading(true);
    setError("");

    try {
      const options = await startPasskeyRegistration(email.trim());
      const regResponse = await startRegistration({ optionsJSON: options });
      const result = await finishPasskeyRegistration(regResponse);

      if (result.success) {
        setLoading(false);
        goToSuccess(isAdmin);
      } else {
        setPasskeyNudgeError(true);
        setLoading(false);
      }
    } catch {
      setPasskeyNudgeError(true);
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        submitOtp(code);
      }
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index]) {
        newDigits[index] = "";
        setDigits(newDigits);
        if (index > 0) digitRefs.current[index - 1]?.focus();
      } else if (index > 0) {
        newDigits[index - 1] = "";
        setDigits(newDigits);
        digitRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    fillDigits(pasted);
    if (pasted.length === 6) {
      submitOtp(pasted);
    }
  };


  const resetToEmail = () => {
    setScreen("email");
    setError("");
    setDigits(["", "", "", "", "", ""]);
    setHint(undefined);
    setResendCooldown(0);
  };

  return (
    <Container size="sm" noPadding>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <Card variant="centered" maxWidth="450px">
        {/* Email Screen */}
        {screen === "email" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={headingStyle}>Welcome</h1>
              <p style={subtextStyle}>Sign in or create an account</p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
            >
              <TextInput
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                disabled={disabled}
                size="lg"
              />
              {error && <div style={errorStyle}>{error}</div>}
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
                {loading ? <><Spinner />Sending code...</> : "Continue"}
              </Button>
            </form>

            <div style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
              <a href="/" style={linkStyle}>Back to home</a>
            </div>
          </>
        )}

        {/* Passkey Prompt Screen */}
        {screen === "passkey-prompt" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={headingStyle}>Welcome back</h1>
              <p style={subtextStyle}>
                {loading ? "Signing you in..." : "Use your fingerprint or face to sign in"}
              </p>
            </div>

            {loading && (
              <div style={{
                textAlign: "center",
                marginBottom: "var(--space-md)",
                color: "var(--color-text-secondary)",
              }}>
                <Spinner />
              </div>
            )}

            {error && (
              <div style={{ ...errorStyle, textAlign: "center", marginBottom: "var(--space-md)", marginTop: 0 }}>
                {error}
              </div>
            )}

            {passkeyDismissed && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={disabled}
                  onClick={handlePasskeyLogin}
                >
                  Retry
                </Button>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-sm)" }}>
                  <button
                    onClick={handlePasskeyPromptFallback}
                    disabled={disabled}
                    style={linkStyle}
                  >
                    Send me a code instead
                  </button>
                  <button onClick={resetToEmail} disabled={disabled} style={linkStyle}>
                    Use a different email
                  </button>
                </div>
              </div>
            )}

            {!passkeyDismissed && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-sm)" }}>
                <button
                  onClick={handlePasskeyPromptFallback}
                  disabled={disabled}
                  style={linkStyle}
                >
                  Send me a code instead
                </button>
                <button onClick={resetToEmail} disabled={disabled} style={linkStyle}>
                  Use a different email
                </button>
              </div>
            )}
          </>
        )}

        {/* OTP Screen */}
        {screen === "otp" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={headingStyle}>Check your email</h1>
              <p style={subtextStyle}>
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            {/* Open Email button */}
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <a
                href={getEmailAction(email).url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "var(--space-sm) var(--space-lg)",
                  background: "var(--color-surface-secondary)",
                  color: "var(--color-action-primary)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  fontFamily: "var(--font-display)",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                {getEmailAction(email).label}
              </a>
            </div>

            {/* 6 digit inputs */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-sm)",
                justifyContent: "center",
                marginBottom: "var(--space-md)",
              }}
              onPaste={handleDigitPaste}
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { digitRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  disabled={disabled}
                  aria-label={`Digit ${i + 1}`}
                  style={{
                    width: "48px",
                    height: "48px",
                    textAlign: "center",
                    fontSize: "var(--font-size-xl)",
                    fontWeight: "var(--font-weight-bold)",
                    fontFamily: "var(--font-display)",
                    border: "1px solid var(--color-border-input)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-primary)",
                    color: "var(--color-text-primary)",
                    outline: "none",
                    caretColor: "var(--color-action-primary)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-action-primary)";
                    e.target.style.boxShadow = "0 0 0 2px var(--color-focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--color-border-input)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            <p style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              textAlign: "center",
              margin: "0 0 var(--space-md) 0",
            }}>
              Enter the 6-digit code from your email
            </p>

            {error && (
              <div style={{
                ...errorStyle,
                textAlign: "center",
                marginBottom: "var(--space-md)",
                marginTop: 0,
              }}>
                {error}
              </div>
            )}

            {loading && (
              <div style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                textAlign: "center",
                marginBottom: "var(--space-md)",
              }}>
                <Spinner /> Verifying...
              </div>
            )}

            {/* Action links */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || disabled}
                style={resendCooldown > 0 || disabled ? disabledLinkStyle : linkStyle}
              >
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>

              <button onClick={resetToEmail} disabled={disabled} style={linkStyle}>
                Use a different email
              </button>

              {hint === "passkey" && (
                <button
                  onClick={handlePasskeyLogin}
                  disabled={disabled}
                  style={linkStyle}
                >
                  Sign in with fingerprint instead
                </button>
              )}
            </div>
          </>
        )}

        {/* Name Screen */}
        {screen === "name" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={headingStyle}>Welcome to Fresh Catch!</h1>
              <p style={subtextStyle}>What should we call you?</p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleNameSubmit(); }}
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
            >
              <TextInput
                label="Name"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                value={nameValue}
                onChange={(e) => { setNameValue(e.target.value); setError(""); }}
                required
                disabled={disabled}
                size="lg"
              />
              {error && <div style={errorStyle}>{error}</div>}
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
                {loading ? <><Spinner />Saving...</> : "Continue"}
              </Button>
            </form>
          </>
        )}

        {/* Passkey Nudge Screen */}
        {screen === "passkey-nudge" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={headingStyle}>Sign in faster next time</h1>
              <p style={subtextStyle}>Use your fingerprint or face to skip the code</p>
            </div>

            {passkeyNudgeError ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <p style={{ ...subtextStyle, textAlign: "center" }}>
                  No problem, you can set it up later in settings
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => goToSuccess(isAdmin)}
                >
                  Continue
                </Button>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ ...errorStyle, textAlign: "center", marginBottom: "var(--space-md)", marginTop: 0 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={disabled}
                    onClick={handlePasskeySetup}
                  >
                    {loading ? <><Spinner />Setting up...</> : "Set it up"}
                  </Button>

                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => goToSuccess(isAdmin)}
                      disabled={disabled}
                      style={linkStyle}
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Success Screen */}
        {screen === "success" && (
          <div style={{ textAlign: "center" }}>
            <h1 style={headingStyle}>You're in!</h1>
            <p style={{
              ...subtextStyle,
              margin: "0 0 var(--space-md) 0",
            }}>
              Redirecting in {countdown}...
            </p>
            <a
              href={redirectUrl}
              style={{
                color: "var(--color-action-primary)",
                textDecoration: "none",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Go now
            </a>
          </div>
        )}
      </Card>
    </Container>
  );
}
