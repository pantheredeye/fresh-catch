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
import "@/admin-design-system/admin-auth.css";

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
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [redirectUrl, setRedirectUrl] = useState('/');

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
      const result = await finishPasskeyLogin(login);

      if (!result.success) {
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
        throw new Error(`Username '${username}' is already taken. Please try a different username.`);
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
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">
              {mode === 'login' ? 'Welcome Back' : 'Join Us'}
            </h1>
            <p className="auth-subtitle">
              {mode === 'login'
                ? `Sign in to ${BUSINESS_CONTEXT}`
                : `Create your account with ${BUSINESS_CONTEXT}`
              }
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            mode === 'login' ? handleLogin() : handleRegister();
          }} className="auth-form">
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

          {/* Mode Toggle */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #E0E0E0'
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
                color: '#0066CC',
                fontSize: '14px',
                textDecoration: 'underline',
                cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif"
              }}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className="auth-status" style={{
              background: getStatusColor(),
              color: getStatusTextColor(),
              border: `1px solid ${getStatusColor()}`
            }}>
              {status === 'loading' && <div className="auth-spinner" />}
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
            <div className="auth-success-link">
              <a href={redirectUrl}>
                Go to dashboard now →
              </a>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
