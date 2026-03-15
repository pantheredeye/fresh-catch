"use client";

import { useState, useTransition } from "react";
import { Button } from "../Button";

interface LoginFormProps {
  onLogin?: (username: string) => Promise<void>;
  onRegister?: (username: string, customerType?: 'individual' | 'business') => Promise<void>;
  businessContext?: string; // e.g., "Fresh Catch Seafood Markets"
  className?: string;
}

/**
 * LoginForm - Context-aware authentication form with glassmorphism design
 *
 * WHY: Single form that handles both admin (Evan) and customer authentication.
 * Context-aware: knows if user is registering for a specific business.
 * Glassmorphism pattern matches the overall design system.
 */
export function LoginForm({
  onLogin,
  onRegister,
  businessContext,
  className = ''
}: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');
  const [showCustomerType, setShowCustomerType] = useState(false);
  const [result, setResult] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    startTransition(async () => {
      try {
        if (mode === 'login') {
          await onLogin?.(username);
        } else {
          await onRegister?.(username, customerType);
        }
      } catch (error) {
        setResult(error instanceof Error ? error.message : 'An error occurred');
      }
    });
  };

  const handleRegisterClick = () => {
    if (businessContext && !showCustomerType) {
      // Show customer type selection for business context
      setShowCustomerType(true);
    } else {
      handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className={`login-form ${className}`} style={containerStyles}>
      <div style={formStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <h2 style={titleStyles}>
            {mode === 'login' ? 'Welcome Back' : 'Get Started'}
          </h2>
          {businessContext && (
            <p style={subtitleStyles}>
              {mode === 'login'
                ? `Sign in to ${businessContext}`
                : `Join ${businessContext}`
              }
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={formInnerStyles}>
          {/* Username Input */}
          <div style={inputGroupStyles}>
            <label htmlFor="username" style={labelStyles}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={inputStyles}
              disabled={isPending}
              required
            />
          </div>

          {/* Customer Type Selection (only for register with business context) */}
          {mode === 'register' && businessContext && showCustomerType && (
            <div style={inputGroupStyles}>
              <label style={labelStyles}>Account Type</label>
              <div style={radioGroupStyles}>
                <label style={radioLabelStyles}>
                  <input
                    type="radio"
                    value="individual"
                    checked={customerType === 'individual'}
                    onChange={(e) => setCustomerType(e.target.value as 'individual')}
                    style={radioStyles}
                  />
                  <span style={radioTextStyles}>
                    <strong>Individual</strong>
                    <small style={radioSubtextStyles}>Personal orders</small>
                  </span>
                </label>
                <label style={radioLabelStyles}>
                  <input
                    type="radio"
                    value="business"
                    checked={customerType === 'business'}
                    onChange={(e) => setCustomerType(e.target.value as 'business')}
                    style={radioStyles}
                  />
                  <span style={radioTextStyles}>
                    <strong>Business</strong>
                    <small style={radioSubtextStyles}>Restaurant/bulk orders</small>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={buttonGroupStyles}>
            {mode === 'login' ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handleSubmit(new Event('submit') as any)}
                  disabled={isPending || !username.trim()}
                >
                  {isPending ? 'Signing in...' : 'Sign In with Passkey'}
                </Button>
              </>
            ) : (
              <>
                {businessContext && !showCustomerType ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleRegisterClick}
                    disabled={isPending || !username.trim()}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => handleSubmit(new Event('submit') as any)}
                    disabled={isPending || !username.trim()}
                  >
                    {isPending ? 'Creating account...' : 'Create Account with Passkey'}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Mode Toggle */}
          <div style={toggleStyles}>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setShowCustomerType(false);
                setResult('');
              }}
              style={toggleButtonStyles}
              disabled={isPending}
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>

        {/* Result Message */}
        {result && (
          <div style={resultStyles}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles with glassmorphism pattern
const containerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: 'var(--space-md)',
  background: 'var(--color-gradient-primary)',
  position: 'relative',
};

const formStyles: React.CSSProperties = {
  background: 'var(--color-glass-light)',
  backdropFilter: 'blur(10px)',
  border: '1px solid var(--color-glass-border-light)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-xl)',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 20px 40px rgba(0, 102, 204, 0.15)',
};

const headerStyles: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 'var(--space-xl)',
};

const titleStyles: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--color-text-inverse)',
  margin: '0 0 var(--space-sm) 0',
  fontFamily: 'var(--font-display)',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '16px',
  color: 'var(--color-text-inverse)',
  margin: 0,
  fontWeight: 400,
};

const formInnerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const inputGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
};

const labelStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-inverse)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyles: React.CSSProperties = {
  padding: 'var(--space-md)',
  fontSize: '16px',
  border: '1px solid var(--color-glass-border-medium)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-glass-light)',
  color: 'var(--color-text-inverse)',
  backdropFilter: 'blur(5px)',
  transition: 'all 0.3s ease',
  outline: 'none',
};

const radioGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const radioLabelStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-sm)',
  cursor: 'pointer',
  padding: 'var(--space-md)',
  border: '1px solid var(--color-glass-border-light)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-glass-subtle)',
  transition: 'all 0.3s ease',
};

const radioStyles: React.CSSProperties = {
  marginTop: '2px',
};

const radioTextStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  color: 'var(--color-text-inverse)',
};

const radioSubtextStyles: React.CSSProperties = {
  color: 'var(--color-text-inverse)',
  opacity: 0.9,
  fontSize: '14px',
};

const buttonGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const toggleStyles: React.CSSProperties = {
  textAlign: 'center',
  marginTop: 'var(--space-lg)',
};

const toggleButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-inverse)',
  cursor: 'pointer',
  fontSize: '14px',
  textDecoration: 'underline',
  padding: '0',
  transition: 'color 0.3s ease',
};

const resultStyles: React.CSSProperties = {
  marginTop: 'var(--space-lg)',
  padding: 'var(--space-md)',
  background: 'var(--color-status-error-bg)',
  border: '1px solid var(--color-status-error-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-inverse)',
  textAlign: 'center',
  fontSize: '14px',
};