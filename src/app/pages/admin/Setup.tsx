"use client";

import { useState, useEffect } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishBusinessOwnerRegistration,
  startBusinessOwnerRegistration,
} from "./functions";
import { TextInput } from "@/design-system/components/Input";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import "@/design-system/tokens.css";

/**
 * Business Owner Setup - Admin registration flow with enhanced UX
 *
 * DESIGN DECISIONS:
 *
 * 1. **Separate Admin Setup Flow** (vs unified registration)
 *    - Decision: Dedicated /admin/setup route for business owners
 *    - Context: Admin setup has different requirements (link to existing org, owner role)
 *    - Rationale: Cleaner UX, different validation rules, future multi-tenant scalability
 *
 * 2. **Enhanced User Experience Design**
 *    - Decision: Progressive feedback with status messages and auto-redirect
 *    - Context: WebAuthn can be confusing, users need clear guidance
 *    - Implementation: Loading states, step-by-step messages, 3-second countdown
 *    - Rationale: Professional feel, reduces user anxiety, clear success indication
 *
 * 3. **Modern Design System Integration**
 *    - Decision: Use design system components (TextInput, Button, Container)
 *    - Context: Consistency with InputDemo and existing components
 *    - Implementation: Glassmorphism styling, proper focus states, design tokens
 *    - Rationale: Visual consistency, maintainability, proven UX patterns
 *
 * 4. **Business Owner Registration Logic**
 *    - Decision: Link to existing seeded user/organization vs create new
 *    - Context: Evan's business already exists from seed data
 *    - Implementation: Find existing user, add credential, verify membership
 *    - Rationale: Preserves existing business data, handles credential-only registration
 *
 * 5. **Status-Based UI States**
 *    - Decision: Explicit status management (idle/loading/success/error)
 *    - Context: Complex async flow with multiple failure points
 *    - Implementation: Color-coded feedback, disabled states, loading animations
 *    - Rationale: Clear user feedback, prevents double-submission, professional polish
 *
 * FUTURE ENHANCEMENTS:
 * - Toast notifications for better messaging
 * - Setup wizard for multi-step business configuration
 * - Manager invitation flow integration
 * - Business logo upload during setup
 */
export function Setup({ ctx }: { ctx: any }) {
  const [username, setUsername] = useState("evan");
  const [businessName, setBusinessName] = useState("Fresh Catch Seafood Markets");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const handleBusinessOwnerSetup = async () => {
    if (!username.trim() || !businessName.trim()) {
      setStatus('error');
      setMessage('Please fill in all fields');
      return;
    }

    setStatus('loading');
    setMessage('Setting up your account...');

    try {
      // 1. Get a challenge from the worker for business owner registration
      setMessage('Generating passkey challenge...');
      const options = await startBusinessOwnerRegistration(username);

      // 2. Ask the browser to sign the challenge
      setMessage('Please complete passkey authentication...');
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      setMessage('Finalizing setup...');
      const success = await finishBusinessOwnerRegistration(username, businessName, registration);

      if (!success) {
        throw new Error("Business owner setup failed. User may already have credentials.");
      }

      setStatus('success');
      setMessage(`Welcome, ${username}! Your business account is ready.`);
      setCountdown(3);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : "Setup failed. Please try again.");
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
    <Container>
      <div style={{
        colorScheme: 'light', // Force light mode rendering
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        background: 'var(--warm-white, #FFFCF8)',
      }}>
        <div style={{
          background: 'white',
          background: 'var(--surface-primary, white)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-2xl)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--soft-gray, #E0E0E0)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 'var(--space-xl)'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#1A1A2E',
              color: 'var(--deep-navy, #1A1A2E)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-sm)'
            }}>
              Business Owner Setup
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              color: 'var(--cool-gray, #6B7280)',
              margin: 0,
              lineHeight: 1.5
            }}>
              Register your business owner account with secure passkey authentication
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleBusinessOwnerSetup();
          }} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-lg)'
          }}>
            <TextInput
              label="Username"
              placeholder="e.g., evan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={status === 'loading' || status === 'success'}
              size="lg"
            />

            <TextInput
              label="Business Name"
              placeholder="Your business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
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
              {status === 'loading' ? 'Setting up...' :
               status === 'success' ? '✓ Setup Complete' :
               'Setup Business Account'}
            </Button>
          </form>

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
                href="/admin"
                style={{
                  color: '#0066CC',
                  color: 'var(--ocean-blue, #0066CC)',
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

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
}