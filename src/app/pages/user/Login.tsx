"use client";

import { useState, useEffect } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  checkEmailExists,
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";

// TODO: Get business context from environment or route
const BUSINESS_CONTEXT = "Fresh Catch Seafood Markets";

/**
 * Customer/Admin Login - Unified authentication with defensive CSS
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
 * 3. **Defensive CSS Pattern** (vs design system tokens)
 *    - Decision: Use admin-auth.css with explicit color values and !important
 *    - Context: System dark mode was overriding token-based styling
 *    - Implementation: auth-page, auth-card CSS classes with forced light mode
 *    - Rationale: Consistent rendering regardless of system theme settings
 *
 * 4. **Dual Authentication Mode**
 *    - Decision: Support both login and registration in same interface
 *    - Context: Customers need to register, admins need to login
 *    - Implementation: Mode switching with different button text and behavior
 *    - Rationale: Flexible UX, single page for all authentication needs
 *
 * 5. **Smart Redirect After Login**
 *    - Decision: Role-based redirect (admin → /admin, customer → /)
 *    - Context: Multi-tenant SaaS where users can be both admin and customer
 *    - Implementation: finishPasskeyLogin returns isAdmin flag, redirect accordingly
 *    - Rationale: Takes users directly to their relevant destination
 */
export function Login({ ctx }: { ctx: any }) {
  const [email, setEmail] = useState("");
  const [flow, setFlow] = useState<'initial' | 'login' | 'register' | 'confirm-register'>('initial');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [redirectUrl, setRedirectUrl] = useState('/');

  const handleContinue = async () => {
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email');
      return;
    }

    setStatus('loading');
    setMessage('Checking account...');

    try {
      const result = await checkEmailExists(email);

      if (result.exists) {
        // Existing user - proceed to login
        setFlow('login');
        setStatus('idle');
        setMessage('');
        handleLogin();
      } else {
        // New user - ask if they want to create account
        setFlow('confirm-register');
        setStatus('idle');
        setMessage('');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Unable to check account. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email');
      return;
    }

    setStatus('loading');
    setMessage('Authenticating...');

    try {
      // 1. Get a challenge from the worker
      setMessage('Generating authentication challenge...');
      const options = await startPasskeyLogin(email);

      // 2. Ask the browser to sign the challenge
      setMessage('Please complete passkey authentication...');
      const login = await startAuthentication({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the login process
      setMessage('Verifying authentication...');
      const result = await finishPasskeyLogin(login);

      if (!result || !result.success) {
        throw new Error("Login failed. Please check your credentials.");
      }

      // Smart redirect: admin users go to dashboard, customers go to home
      const destination = result.isAdmin ? '/admin' : '/';
      setRedirectUrl(destination);

      setStatus('success');
      setMessage(`Welcome back! Redirecting to your dashboard...`);
      setCountdown(3);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : "Login failed. Please try again.");
    }
  };

  const handleRegister = async () => {
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
      const options = await startPasskeyRegistration(email);

      // 2. Ask the browser to sign the challenge
      setMessage('Please complete passkey setup...');
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      setMessage('Finalizing registration...');
      const result = await finishPasskeyRegistration(email, email, registration);

      if (!result || !result.success) {
        throw new Error(`Email '${email}' is already registered. Please sign in instead.`);
      }

      // Smart redirect: admin users go to setup, customers go to home
      const destination = result.isAdmin ? '/admin/setup' : '/';
      setRedirectUrl(destination);

      setStatus('success');
      const welcomeMessage = result.isAdmin
        ? `Welcome! Let's set up your business.`
        : `Welcome to Fresh Catch! Check out our markets.`;
      setMessage(welcomeMessage);
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
          window.location.href = redirectUrl;
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, countdown, redirectUrl]);

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
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <h1
            style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
              margin: '0 0 var(--space-xs) 0'
            }}
          >
            {flow === 'confirm-register' ? 'Create Account' :
             flow === 'register' ? 'Create Account' :
             flow === 'login' ? 'Welcome Back' :
             'Welcome'}
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              lineHeight: 'var(--line-height-base)'
            }}
          >
            {flow === 'confirm-register'
              ? `Create a new account with ${BUSINESS_CONTEXT}`
              : flow === 'register'
              ? `Create your account with ${BUSINESS_CONTEXT}`
              : flow === 'login'
              ? `Sign in to ${BUSINESS_CONTEXT}`
              : `Sign in or create an account`
            }
          </p>
        </div>

        {flow === 'confirm-register' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--color-status-info)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                textAlign: 'center'
              }}
            >
              No account found for <strong>{email}</strong>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
              Would you like to create a new account?
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  setFlow('initial');
                  setEmail('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleRegister}
              >
                Create Account
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (flow === 'initial') {
                handleContinue();
              } else if (flow === 'login') {
                handleLogin();
              } else {
                handleRegister();
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
          >
            <TextInput
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {status === 'loading' ? (flow === 'login' ? 'Signing in...' : flow === 'register' ? 'Creating Account...' : 'Checking...') :
               status === 'success' ? '✓ Success' :
               flow === 'initial' ? 'Continue' :
               flow === 'login' ? 'Sign In with Passkey' :
               'Create Account with Passkey'}
            </Button>
          </form>
        )}

        {/* Manual Toggle - for users who prefer explicit choice */}
        {flow === 'initial' && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              textAlign: 'center',
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--color-border-subtle)'
            }}
          >
            <button
              onClick={() => {
                setFlow('register');
                setStatus('idle');
                setMessage('');
              }}
              disabled={status === 'loading' || status === 'success'}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-action-primary)',
                fontSize: 'var(--font-size-sm)',
                textDecoration: 'underline',
                cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)'
              }}
            >
              I want to create a new account
            </button>
          </div>
        )}
        {(flow === 'register' || flow === 'confirm-register') && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              textAlign: 'center',
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--color-border-subtle)'
            }}
          >
            <button
              onClick={() => {
                setFlow('initial');
                setStatus('idle');
                setMessage('');
              }}
              disabled={status === 'loading' || status === 'success'}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-action-primary)',
                fontSize: 'var(--font-size-sm)',
                textDecoration: 'underline',
                cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)'
              }}
            >
              Back to sign in
            </button>
          </div>
        )}

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
              href={redirectUrl}
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
