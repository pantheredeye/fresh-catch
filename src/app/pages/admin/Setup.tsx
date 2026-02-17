"use client";

import { useState, useEffect } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startRegistration,
} from "@simplewebauthn/browser";
import {
  createBusinessForLoggedInUser,
  finishBusinessOwnerRegistration,
  startBusinessOwnerRegistration,
} from "./functions";
import { TextInput, Button, Container, Card } from "@/design-system";

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
  const isLoggedIn = !!ctx.user;
  const [username, setUsername] = useState("evan");
  const [businessName, setBusinessName] = useState("Fresh Catch Seafood Markets");
  const [slug, setSlug] = useState("fresh-catch-seafood-markets");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Auto-generate slug from business name
  useEffect(() => {
    const autoSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
    setSlug(autoSlug);
  }, [businessName]);

  const handleBusinessOwnerSetup = async () => {
    // If logged in, use simpler flow (no WebAuthn)
    if (isLoggedIn) {
      if (!businessName.trim() || !slug.trim()) {
        setStatus('error');
        setMessage('Please fill in all fields');
        return;
      }

      setStatus('loading');
      setMessage('Creating your business...');

      try {
        const result = await createBusinessForLoggedInUser(businessName, slug);

        if (!result.success) {
          throw new Error(result.error || "Business creation failed");
        }

        setStatus('success');
        setMessage(`Success! Your business "${businessName}" is ready.`);
        setCountdown(3);

      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : "Business creation failed. Please try again.");
      }
      return;
    }

    // If not logged in, use full WebAuthn registration flow
    if (!username.trim() || !businessName.trim() || !slug.trim()) {
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
      const success = await finishBusinessOwnerRegistration(username, businessName, slug, registration);

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
      case 'success': return 'var(--color-status-success)';
      case 'error': return 'var(--color-status-error)';
      case 'loading': return 'var(--sky-blue)';
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
      <Card variant="centered" maxWidth="480px">
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
            {isLoggedIn ? 'Create Your Business' : 'Business Owner Setup'}
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              lineHeight: 'var(--line-height-base)'
            }}
          >
            {isLoggedIn
              ? `Logged in as ${ctx.user?.username}. Set up your business below.`
              : 'Register your business owner account with secure passkey authentication'}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBusinessOwnerSetup();
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}
        >
            {!isLoggedIn && (
              <TextInput
                label="Username"
                placeholder="e.g., evan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={status === 'loading' || status === 'success'}
                size="lg"
              />
            )}

            <TextInput
              label="Business Name"
              placeholder="Your business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              disabled={status === 'loading' || status === 'success'}
              size="lg"
            />

            <TextInput
              label="URL Slug"
              placeholder="e.g., evan or fresh-catch"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              disabled={status === 'loading' || status === 'success'}
              size="lg"
              helperText={`Your customer page: yoursite.com/?b=${slug || 'your-slug'}`}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading'
                ? (isLoggedIn ? 'Creating Business...' : 'Setting up...')
                : status === 'success'
                  ? '✓ Setup Complete'
                  : (isLoggedIn ? 'Create Business' : 'Setup Business Account')}
          </Button>
        </form>

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