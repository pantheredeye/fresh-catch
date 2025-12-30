"use client";

/**
 * ComponentName - Brief description of what this component does
 *
 * WHY: Explain the purpose and design rationale
 * TOKENS USED: List key tokens (for documentation)
 * DARK MODE: Compatible ✅ | Special handling needed ⚠️
 */

import React from 'react';

interface ComponentNameProps {
  /** Description of prop */
  propName?: string;
  /** Optional variant */
  variant?: 'default' | 'alternate';
  /** Children content */
  children?: React.ReactNode;
}

export function ComponentName({
  propName = 'default',
  variant = 'default',
  children
}: ComponentNameProps) {
  return (
    <div
      className="component-name"  // Use utility classes where applicable
      style={containerStyles}
    >
      <h2 className="heading-xl">  {/* ✅ Use utility class for typography */}
        Title Text
      </h2>

      <p className="body-md text-secondary">  {/* ✅ Multiple utility classes */}
        {children}
      </p>

      <div style={dynamicStyles(variant)}>  {/* ✅ Inline OK for dynamic values */}
        Dynamic content
      </div>
    </div>
  );
}

/**
 * STYLE PATTERNS - Follow these guidelines:
 */

// ✅ GOOD - Static styles using tokens
const containerStyles: React.CSSProperties = {
  // Use tokens for ALL colors
  background: 'var(--surface-primary)',     // Auto-adapts to dark mode
  color: 'var(--text-primary)',             // Auto-adapts to dark mode
  borderColor: 'var(--border-light)',       // Auto-adapts to dark mode

  // Use tokens for ALL spacing
  padding: 'var(--space-md)',
  gap: 'var(--space-sm)',
  marginBottom: 'var(--space-lg)',

  // Use tokens for ALL typography
  fontSize: 'var(--font-size-md)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-base)',
  fontFamily: 'var(--font-modern)',

  // Use tokens for ALL borders/radii
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-sm)',
};

// ✅ GOOD - Dynamic styles (state/prop dependent)
function dynamicStyles(variant: string): React.CSSProperties {
  return {
    // Dynamic values based on props/state
    background: variant === 'alternate'
      ? 'var(--surface-favorite)'  // Still use tokens!
      : 'var(--surface-primary)',

    // Transform/animation values can be literal
    transform: 'translateY(-2px)',
    transition: 'all 0.3s ease',
  };
}

// ❌ BAD - Hardcoded colors (breaks dark mode)
const badStyles: React.CSSProperties = {
  background: 'white',              // ❌ Use var(--surface-primary)
  color: '#1A2B3D',                 // ❌ Use var(--text-primary)
  borderColor: '#e0e0e0',           // ❌ Use var(--border-light)
  fontSize: '16px',                 // ❌ Use var(--font-size-md)
  padding: '20px',                  // ❌ Use var(--space-md)
};

/**
 * UTILITY CLASS USAGE:
 *
 * Typography:
 * - .heading-3xl, .heading-2xl, .heading-xl, .heading-lg
 * - .body-md, .body-sm
 * - .label-sm, .caption
 * - .text-primary, .text-secondary
 *
 * Layout:
 * - .flex-col, .flex-between, .flex-center
 * - .grid-2, .grid-3, .grid-auto
 * - .gap-xs, .gap-sm, .gap-md, .gap-lg
 * - .p-md, .mb-lg
 *
 * Component Patterns:
 * - .status-badge, .info-box, .form-group
 * - .card-elevated, .card-glass
 */

/**
 * WHEN TO USE WHAT:
 *
 * Utility Classes:
 * - Typography hierarchy (.heading-xl, .body-md)
 * - Common layouts (.flex-col, .gap-md)
 * - Text colors (.text-primary, .text-secondary)
 *
 * Inline Styles (with tokens):
 * - Component-specific styles
 * - Non-standard spacing/sizing
 * - Composed styles from multiple tokens
 *
 * Inline Styles (dynamic):
 * - State-dependent values
 * - Prop-dependent values
 * - Computed/calculated values
 * - Transform/transition animations
 *
 * NEVER:
 * - Hardcoded hex colors
 * - Hardcoded pixel values for spacing/typography
 * - Inline rgba() unless referencing a token
 */
