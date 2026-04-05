"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { requestOtp, verifyOtp } from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";

type Screen = "email" | "otp";

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

export function Login({ ctx }: { ctx: any }) {
  const [email, setEmail] = useState("");
  const [screen, setScreen] = useState<Screen>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState("/");
  const [countdown, setCountdown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [bSlug, setBSlug] = useState<string | null>(null);

  // OTP digit state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenOtpRef = useRef<HTMLInputElement | null>(null);

  // Capture ?b= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("b");
    if (b) setBSlug(b);
  }, []);

  const withBParam = (url: string) =>
    bSlug ? `${url}${url.includes("?") ? "&" : "?"}b=${bSlug}` : url;

  const disabled = loading || success || rateLimitCooldown > 0;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Rate limit cooldown timer — live-update error message
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

  // Redirect countdown
  useEffect(() => {
    if (!success || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        window.location.href = redirectUrl;
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, redirectUrl]);

  // WebOTP API - auto-read OTP from SMS/email on Android Chrome
  useEffect(() => {
    if (screen !== "otp") return;
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();
    (navigator.credentials as any)
      .get({ otp: { transport: ["email"] }, signal: ac.signal })
      .then((otpCredential: any) => {
        if (otpCredential?.code) {
          const code = otpCredential.code.slice(0, 6);
          fillDigits(code);
          submitOtp(code);
        }
      })
      .catch(() => {});

    return () => ac.abort();
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillDigits = (code: string) => {
    const chars = code.replace(/\D/g, "").slice(0, 6).split("");
    const newDigits = Array(6).fill("").map((_, i) => chars[i] || "");
    setDigits(newDigits);
    // Focus last filled or first empty
    const focusIdx = Math.min(chars.length, 5);
    digitRefs.current[focusIdx]?.focus();
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

      const destination = withBParam(result.isAdmin ? "/admin" : "/");
      setRedirectUrl(destination);
      setSuccess(true);
      setCountdown(2);
    } catch {
      setError("Verification failed. Try again.");
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
      setScreen("otp");
      setResendCooldown(30);
      setDigits(["", "", "", "", "", ""]);
      setLoading(false);
      // Focus first digit after render
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } catch {
      setError("Unable to send code. Try again.");
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
      setError("Failed to resend. Try again.");
    }
    setLoading(false);
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6th digit
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
        // Clear current digit and move to previous
        newDigits[index] = "";
        setDigits(newDigits);
        if (index > 0) digitRefs.current[index - 1]?.focus();
      } else if (index > 0) {
        // Already empty — clear previous and move there
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

  // Hidden OTP input for mobile autofill
  const handleHiddenOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.replace(/\D/g, "").slice(0, 6);
    if (code) {
      fillDigits(code);
      if (code.length === 6) {
        submitOtp(code);
      }
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
      <Card variant="centered" maxWidth="450px">
        {/* Email Screen */}
        {screen === "email" && !success && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-display)",
                margin: "0 0 var(--space-xs) 0",
              }}>
                Welcome
              </h1>
              <p style={{
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}>
                Sign in or create an account
              </p>
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
              {error && (
                <div style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-status-error)",
                  marginTop: "calc(-1 * var(--space-xs))",
                }}>
                  {error}
                </div>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={disabled}>
                {loading ? "Sending code..." : "Continue"}
              </Button>
            </form>

            <div style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
              <a href="/" style={linkStyle}>Back to home</a>
            </div>
          </>
        )}

        {/* OTP Screen */}
        {screen === "otp" && !success && (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
              <h1 style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-display)",
                margin: "0 0 var(--space-xs) 0",
              }}>
                Check your email
              </h1>
              <p style={{
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}>
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            {/* Hidden input for mobile autofill */}
            <input
              ref={hiddenOtpRef}
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              onChange={handleHiddenOtpChange}
              style={{
                position: "absolute",
                opacity: 0,
                width: "1px",
                height: "1px",
                overflow: "hidden",
                pointerEvents: "none",
              }}
              tabIndex={-1}
              aria-hidden="true"
            />

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

            {error && (
              <div style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-status-error)",
                textAlign: "center",
                marginBottom: "var(--space-md)",
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
                Verifying...
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
                  onClick={() => {
                    // TODO: Wire up passkey login flow
                    // For now this is a placeholder - passkey registration
                    // will be handled in a separate epic
                  }}
                  disabled={disabled}
                  style={linkStyle}
                >
                  Sign in with fingerprint instead
                </button>
              )}
            </div>
          </>
        )}

        {/* Success */}
        {success && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-display)",
              margin: "0 0 var(--space-xs) 0",
            }}>
              You're in!
            </h1>
            <p style={{
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-secondary)",
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
