import { ReactNode } from 'react'

export interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'coral' | 'mint' | 'gold'
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

/**
 * Badge - Notification badges and indicators
 * 
 * WHY: Extracted from BottomNav for reusability. Can indicate counts,
 * status, or special markers throughout the app.
 */
export function Badge({ 
  children, 
  variant = 'default',
  size = 'sm',
  className = '',
  style = {}
}: BadgeProps) {
  const variantStyles = {
    default: {
      background: 'var(--coral)',
      color: 'white'
    },
    coral: {
      background: 'var(--coral)',
      color: 'white'
    },
    mint: {
      background: 'var(--mint-fresh)',
      color: 'white'
    },
    gold: {
      background: 'var(--warm-gold)',
      color: 'white'
    }
  }

  const sizeStyles = {
    sm: {
      fontSize: '10px',
      padding: '2px 6px',
      minWidth: '16px'
    },
    md: {
      fontSize: '12px',
      padding: '4px 8px',
      minWidth: '20px'
    }
  }

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  }

  return (
    <span 
      className={`badge badge--${variant} badge--${size} ${className}`}
      style={baseStyles}
    >
      {children}
    </span>
  )
}

/**
 * NotificationBadge - Positioned badge for overlaying on elements
 * 
 * WHY: Common pattern for nav items, profile avatars, etc.
 */
export interface NotificationBadgeProps extends BadgeProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  offset?: string
}

export function NotificationBadge({ 
  children,
  variant = 'default',
  size = 'sm',
  position = 'top-right',
  offset = '0px',
  className = ''
}: NotificationBadgeProps) {
  const positionStyles = {
    'top-right': {
      position: 'absolute' as const,
      top: offset,
      right: offset,
      borderRadius: 'var(--radius-full)',
    },
    'top-left': {
      position: 'absolute' as const,
      top: offset,
      left: offset,
          borderRadius: 'var(--radius-full)',
    },
    'bottom-right': {
      position: 'absolute' as const,
      bottom: offset,
      right: offset,
      borderRadius: 'var(--radius-full)',
    },
    'bottom-left': {
      position: 'absolute' as const,
      bottom: offset,
      left: offset,
          borderRadius: 'var(--radius-full)',
    }
  }

  return (
    <Badge
      variant={variant}
      size={size}
      className={`notification-badge ${className}`}
      style={positionStyles[position]}
    >
      {children}
    </Badge>
  )
}