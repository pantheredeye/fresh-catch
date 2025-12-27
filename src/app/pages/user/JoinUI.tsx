"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  finishJoinCodeRegistration,
  startPasskeyRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";

export function JoinUI({ code, role, roleLabel }: {
  code: string;
  role: string;
  roleLabel: string;
}) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleRegister = async () => {
    if (!username.trim()) {
      setStatus('error');
      setMessage('Please enter a username');
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
      const result = await finishJoinCodeRegistration(username, code, registration);

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
      case 'success': return 'var(--mint-green)';
      case 'error': return 'var(--coral)';
      case 'loading': return 'var(--sky-blue)';
      default: return 'var(--soft-gray)';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'success': return 'var(--deep-navy)';
      case 'error': return 'white';
      case 'loading': return 'var(--deep-navy)';
      default: return 'var(--deep-navy)';
    }
  };

  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
              margin: '0 0 var(--space-xs) 0'
            }}
          >
            Join Fresh Catch Team
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'var(--mint-green)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--deep-navy)',
            marginBottom: 'var(--space-sm)'
          }}>
            {roleLabel}
          </div>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--cool-gray)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
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
              fontSize: '14px',
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
                color: 'var(--ocean-blue)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500
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
