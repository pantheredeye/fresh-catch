import { type ReactNode } from 'react'

interface FreshBadgeProps {
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * FreshBadge - Animated "Fresh" indicator with seafoam energy
 * 
 * WHY: From customer.html design evolution - "Fresh" indicators need energy and movement.
 * Subtle bounce animation + seafoam color = excitement about fresh catch.
 * Essential for communicating freshness and availability.
 */
export function FreshBadge({ children = 'Fresh', size = 'md', className = '' }: FreshBadgeProps) {
  const sizeStyles = {
    sm: {
      fontSize: '11px',
      padding: '4px 8px',
      fontWeight: 600
    },
    md: {
      fontSize: '12px',
      padding: 'var(--space-xs) var(--space-sm)',
      fontWeight: 600
    },
    lg: {
      fontSize: '14px',
      padding: 'var(--space-sm) var(--space-md)',
      fontWeight: 700
    }
  }

  return (
    <span
      className={`fresh-badge fresh-badge--${size} ${className}`}
      style={{
        display: 'inline-block',
        background: 'var(--color-status-success)',
        color: 'var(--color-text-inverse)',
        borderRadius: 'var(--radius-full)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,217,177,0.3)',
        animation: 'fresh-bounce 2s ease-in-out infinite',
        userSelect: 'none',
        ...sizeStyles[size]
      }}
    >
      {children}
    </span>
  )
}

// Live indicator variant - for "LIVE" status
interface LiveBadgeProps {
  className?: string
}

export function LiveBadge({ className = '' }: LiveBadgeProps) {
  return (
    <span
      className={`live-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        background: 'var(--color-status-error-bg)',
        color: 'var(--color-action-secondary)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        border: '1px solid var(--color-status-error-border)'
      }}
    >
      <span
        className="live-pulse"
        style={{
          width: '6px',
          height: '6px',
          background: 'var(--color-action-secondary)',
          borderRadius: '50%',
          animation: 'live-pulse 1.5s ease-in-out infinite'
        }}
      />
      Live
    </span>
  )
}

// Available status variant - for time-sensitive items
interface AvailableBadgeProps {
  timeLeft?: string
  className?: string
}

export function AvailableBadge({ timeLeft, className = '' }: AvailableBadgeProps) {
  return (
    <span
      className={`available-badge ${className}`}
      style={{
        display: 'inline-block',
        background: 'var(--color-accent-gold)',
        color: 'var(--color-text-inverse)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        boxShadow: 'var(--shadow-gold)'
      }}
    >
      {timeLeft ? `${timeLeft} left` : 'Available'}
    </span>
  )
}