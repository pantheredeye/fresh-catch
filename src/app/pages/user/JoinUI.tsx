"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  addMembershipWithJoinCode,
  finishJoinCodeRegistration,
  startPasskeyRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";

export function JoinUI({ code, role, roleLabel, isLoggedIn }: {
  code?: string;
  role?: string;
  roleLabel?: string;
  isLoggedIn?: boolean;
} = {}) {
  const [enteredCode, setEnteredCode] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  // If no code provided via URL, show code entry form
  if (!code) {
    return <CodeEntryForm
      enteredCode={enteredCode}
      setEnteredCode={setEnteredCode}
      status={status}
      message={message}
    />;
  }

  // If logged in with valid code, show confirmation to add membership
  if (isLoggedIn && code && role && roleLabel) {
    return <AddMembershipConfirm code={code} role={role} roleLabel={roleLabel} />;
  }

  const handleRegister = async () => {
    if (!username.trim()) {
      setStatus('error');
      setMessage('Please enter a username');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email');
      return;
    }

    setStatus('loading');
    setMessage('Creating your account...');

    try {
      // 1. Get a challenge from the worker
      setMessage('Generating registration challenge...');
      const options = await startPasskeyRegistration(username);

      // 2. Ask the browser to sign the challenge
      setMessage('Please complete passkey setup...');
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      setMessage('Finalizing registration...');
      const result = await finishJoinCodeRegistration(username, email, code, registration);

      if (!result.success) {
        throw new Error(`Username '${username}' is already taken or registration failed.`);
      }

      setStatus('success');
      setMessage(`Welcome to Fresh Catch! You're now a ${roleLabel}.`);
      setCountdown(3);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  // Countdown and redirect on success
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 1) {
          window.location.href = '/admin';
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, countdown]);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'var(--color-status-success)';
      case 'error': return 'var(--color-action-secondary)';
      case 'loading': return 'var(--color-status-info)';
      default: return 'var(--color-text-tertiary)';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'success': return 'var(--color-text-primary)';
      case 'error': return 'var(--color-text-inverse)';
      case 'loading': return 'var(--color-text-primary)';
      default: return 'var(--color-text-primary)';
    }
  };

  return (
    <Container size="sm" noPadding>
      <Card variant="centered" maxWidth="450px">
        <div className="text-centered-section">
          <h1 className="text-heading-lg">
            Join Fresh Catch Team
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'var(--color-status-success)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            {roleLabel}
          </div>
          <p className="text-subheading">
            Create your admin account with secure passkey authentication
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}
        >
          <TextInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={status === 'loading' || status === 'success'}
            size="lg"
            autoFocus
          />

          <TextInput
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === 'loading' || status === 'success'}
            size="lg"
            helperText="For order notifications and account recovery"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={status === 'loading' || status === 'success'}
          >
            {status === 'loading' ? 'Creating Account...' :
             status === 'success' ? '✓ Success' :
             'Create Account with Passkey'}
          </Button>
        </form>

        {/* Status Message */}
        {message && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              background: getStatusColor(),
              color: getStatusTextColor(),
              border: `1px solid ${getStatusColor()}`
            }}
          >
            {status === 'loading' && (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid currentColor',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
            )}
            <span>
              {message}
              {status === 'success' && countdown > 0 && (
                <> Redirecting in {countdown}...</>
              )}
            </span>
          </div>
        )}

        {/* Success Link */}
        {status === 'success' && (
          <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            <a
              href="/admin"
              style={{
                color: 'var(--color-action-primary)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Go to dashboard now →
            </a>
          </div>
        )}
      </Card>
    </Container>
  );
}

function CodeEntryForm({ enteredCode, setEnteredCode, status, message }: {
  enteredCode: string;
  setEnteredCode: (code: string) => void;
  status: string;
  message: string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim()) {
      // Redirect to /join with code parameter for server-side validation
      window.location.href = `/join?code=${encodeURIComponent(enteredCode.trim())}`;
    }
  };

  return (
    <Container size="sm" noPadding>
      <Card variant="centered" maxWidth="450px">
        <div className="text-centered-section">
          <h1 className="text-heading-lg">
            Join Fresh Catch Team
          </h1>
          <p className="text-subheading">
            Enter your invite code to get started
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}
        >
          <TextInput
            label="Invite Code"
            placeholder="Enter your invite code"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
            required
            size="lg"
            helperText="Ask your admin for an invite code"
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
          >
            Continue
          </Button>
        </form>
      </Card>
    </Container>
  );
}

function AddMembershipConfirm({ code, role, roleLabel }: {
  code: string;
  role: string;
  roleLabel: string;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleAddMembership = async () => {
    setStatus('loading');
    setMessage('Adding you to Fresh Catch team...');

    try {
      const result = await addMembershipWithJoinCode(code);

      if (!result.success) {
        throw new Error(result.error || "Failed to add membership");
      }

      setStatus('success');
      setMessage(`Success! You're now a ${roleLabel} at Fresh Catch.`);
      setCountdown(3);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : "Failed to add membership. Please try again.");
    }
  };

  // Countdown and redirect on success
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 1) {
          window.location.href = '/admin';
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, countdown]);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'var(--color-status-success)';
      case 'error': return 'var(--color-action-secondary)';
      case 'loading': return 'var(--color-status-info)';
      default: return 'var(--color-text-tertiary)';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'success': return 'var(--color-text-primary)';
      case 'error': return 'var(--color-text-inverse)';
      case 'loading': return 'var(--color-text-primary)';
      default: return 'var(--color-text-primary)';
    }
  };

  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div className="text-centered-section">
          <h1 className="text-heading-lg">
            Join Fresh Catch Team
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'var(--color-status-success)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            {roleLabel}
          </div>
          <p className="text-subheading">
            Your invite code has been verified. Click below to become a {roleLabel}.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleAddMembership}
          disabled={status === 'loading' || status === 'success'}
        >
          {status === 'loading' ? 'Adding...' :
           status === 'success' ? '✓ Success' :
           `Join as ${roleLabel}`}
        </Button>

        {/* Status Message */}
        {message && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              background: getStatusColor(),
              color: getStatusTextColor(),
              border: `1px solid ${getStatusColor()}`
            }}
          >
            {status === 'loading' && (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid currentColor',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
            )}
            <span>
              {message}
              {status === 'success' && countdown > 0 && (
                <> Redirecting in {countdown}...</>
              )}
            </span>
          </div>
        )}

        {/* Success Link */}
        {status === 'success' && (
          <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            <a
              href="/admin"
              style={{
                color: 'var(--color-action-primary)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Go to dashboard now →
            </a>
          </div>
        )}
      </Card>
    </Container>
  );
}
