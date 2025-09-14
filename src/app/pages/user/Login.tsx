"use client";

import { useState, useEffect } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "./functions";
import { TextInput } from "@/design-system/components/Input";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import "@/design-system/tokens.css";

// TODO: Get business context from environment or route
const BUSINESS_CONTEXT = "Fresh Catch Seafood Markets";

/**
 * Customer/Admin Login - Modern design with enhanced UX
 *
 * DESIGN DECISIONS:
 *
 * 1. **Unified Login Flow** (vs separate admin/customer pages)
 *    - Decision: Single login page for both customers and admins
 *    - Context: Role-based access after login, same authentication method
 *    - Rationale: Simpler UX, consistent authentication, role determined post-login
 *
 * 2. **Enhanced User Experience Design**
 *    - Decision: Match admin setup UX with progressive feedback and status management
 *    - Context: Login can be confusing, users need clear feedback
 *    - Implementation: Loading states, step-by-step messages, success/error handling
 *    - Rationale: Professional feel, consistent with admin setup experience
 *
 * 3. **Modern Design System Integration**
 *    - Decision: Replace LoginForm component with direct design system components
 *    - Context: Match the styling from admin setup page
 *    - Implementation: TextInput, Button, Container components with glassmorphism
 *    - Rationale: Visual consistency, maintainability, modern look
 *
 * 4. **Dual Authentication Mode**
 *    - Decision: Support both login and registration in same interface
 *    - Context: Customers need to register, admins need to login
 *    - Implementation: Mode switching with different button text and behavior
 *    - Rationale: Flexible UX, single page for all authentication needs
 */
export function Login({ ctx }: { ctx: any }) {
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleLogin = async () => {
    if (!username.trim()) {
      setStatus('error');
      setMessage('Please enter a username');
      return;
    }

    setStatus('loading');
    setMessage('Authenticating...');

    try {
      // 1. Get a challenge from the worker
      setMessage('Generating authentication challenge...');
      const options = await startPasskeyLogin();

      // 2. Ask the browser to sign the challenge
      setMessage('Please complete passkey authentication...');
      const login = await startAuthentication({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the login process
      setMessage('Verifying authentication...');
      const success = await finishPasskeyLogin(login);

      if (!success) {
        throw new Error("Login failed. Please check your credentials.");
      }

      setStatus('success');
      setMessage(`Welcome back! Redirecting to your dashboard...`);
      setCountdown(3);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : "Login failed. Please try again.");
    }
  };

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
      const success = await finishPasskeyRegistration(username, registration);

      if (!success) {
        throw new Error("Registration failed. Username may already exist.");
      }

      setStatus('success');
      setMessage(`Welcome to ${BUSINESS_CONTEXT}! Registration complete.`);
      setCountdown(3);

      // TODO: Create organization for customer based on customerType
      // TODO: Link customer to business context (Evan's organization)
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
          window.location.href = '/';
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
    <Container>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
      }}>
        <div style={{
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-2xl)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--soft-gray)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 'var(--space-xl)'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-sm)'
            }}>
              {mode === 'login' ? 'Welcome Back' : 'Join Us'}
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'var(--cool-gray)',
              margin: 0,
              lineHeight: 1.5
            }}>
              {mode === 'login'
                ? `Sign in to ${BUSINESS_CONTEXT}`
                : `Create your account with ${BUSINESS_CONTEXT}`
              }
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            mode === 'login' ? handleLogin() : handleRegister();
          }} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-lg)'
          }}>
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
              {status === 'loading' ? (mode === 'login' ? 'Signing in...' : 'Creating Account...') :
               status === 'success' ? '✓ Success' :
               mode === 'login' ? 'Sign In with Passkey' : 'Create Account with Passkey'}
            </Button>
          </form>

          <div style={{
            marginTop: 'var(--space-lg)',
            textAlign: 'center'
          }}>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setStatus('idle');
                setMessage('');
              }}
              disabled={status === 'loading' || status === 'success'}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ocean-blue)',
                fontSize: '14px',
                textDecoration: 'underline',
                cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)'
              }}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>

          {message && (
            <div style={{
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              textAlign: 'center',
              background: getStatusColor(),
              color: getStatusTextColor(),
              border: `1px solid ${getStatusColor()}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)'
            }}>
              {status === 'loading' && <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid currentColor',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />}
              <span>
                {message}
                {status === 'success' && countdown > 0 && (
                  <> Redirecting in {countdown}...</>
                )}
              </span>
            </div>
          )}

          {status === 'success' && (
            <div style={{
              marginTop: 'var(--space-md)',
              textAlign: 'center'
            }}>
              <a
                href="/"
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
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
}
