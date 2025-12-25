import { type ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'cancel' | 'danger' | 'secondary-admin' | 'add-event'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Button - Unified button system for customer and admin interfaces
 *
 * WHY: Single source of truth for all buttons. Customer variants use gradients for premium feel,
 * admin variants use outline/solid styles for functional clarity.
 *
 * Customer variants: primary, secondary, ghost, outline
 * Admin variants: cancel, danger, secondary-admin, add-event
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  href,
  onClick,
  disabled = false,
  type = 'button'
}: ButtonProps) {

  const sizeStyles = {
    sm: {
      fontSize: '14px',
      padding: '8px 16px',
      fontWeight: 600,
      minHeight: '36px'
    },
    md: {
      fontSize: '16px',
      padding: '14px 24px',
      fontWeight: variant.includes('admin') || variant === 'cancel' || variant === 'danger' ? 600 : 700,
    },
    lg: {
      fontSize: '18px',
      padding: '16px 24px',
      fontWeight: 700,
      minHeight: '48px'
    }
  }

  const variantStyles = {
    // Customer variants
    primary: {
      background: 'var(--ocean-gradient)',
      color: 'white',
      border: 'none',
      boxShadow: 'var(--shadow-md)',
    },
    secondary: {
      background: 'var(--coral-gradient)',
      color: 'white',
      border: 'none',
      boxShadow: 'var(--shadow-coral)'
    },
    ghost: {
      background: 'var(--surface-primary)',
      color: 'var(--ocean-blue)',
      border: '1px solid rgba(0,102,204,0.08)',
      boxShadow: 'var(--shadow-sm)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--ocean-blue)',
      border: '2px solid var(--ocean-blue)',
      boxShadow: 'none'
    },
    // Admin variants
    cancel: {
      background: 'white',
      color: 'var(--coral)',
      border: '2px solid var(--coral)',
      boxShadow: 'none'
    },
    danger: {
      background: 'white',
      color: 'var(--coral)',
      border: '2px solid var(--coral)',
      boxShadow: 'none'
    },
    'secondary-admin': {
      background: 'white',
      color: '#856404',
      border: '2px solid var(--warm-gold)',
      boxShadow: 'none'
    },
    'add-event': {
      background: 'var(--ocean-blue)',
      color: 'white',
      border: 'none',
      boxShadow: 'var(--shadow-md)'
    }
  }

  const disabledStyles = disabled ? {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: 'var(--light-gray)',
    color: 'var(--cool-gray)',
    border: '2px solid transparent',
    boxShadow: 'none'
  } : {}

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-xs)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    userSelect: 'none',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-display)',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...disabledStyles
  }

  // Handle both links and buttons
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={`btn btn--${variant} btn--${size} ${className}`}
        style={baseStyles}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`btn btn--${variant} btn--${size} ${className}`}
      style={baseStyles}
    >
      {children}
    </button>
  )
}

// Specialized button variants for common use cases

interface OrderButtonProps {
  children?: ReactNode
  href?: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OrderButton({
  children = 'Order Fish',
  href,
  onClick,
  size = 'md',
  className = ''
}: OrderButtonProps) {
  return (
    <Button
      variant="primary"
      size={size}
      href={href}
      onClick={onClick}
      className={`order-button ${className}`}
    >
      {children}
    </Button>
  )
}

interface QuickActionProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export function QuickAction({ children, href, onClick, className = '' }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      href={href}
      onClick={onClick}
      className={`quick-action ${className}`}
    >
      {children}
    </Button>
  )
}

// Admin specialized button variants

interface CancelButtonProps {
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

export function CancelButton({
  children = 'Cancel',
  size = 'sm',
  className = '',
  onClick
}: CancelButtonProps) {
  return (
    <Button
      variant="cancel"
      size={size}
      onClick={onClick}
      className={`cancel-button ${className}`}
    >
      {children}
    </Button>
  )
}

interface AddEventButtonProps {
  children?: ReactNode
  className?: string
  fullWidth?: boolean
  onClick?: () => void
}

export function AddEventButton({
  children = '+ Add Special Event',
  className = '',
  fullWidth = true,
  onClick
}: AddEventButtonProps) {
  return (
    <Button
      variant="add-event"
      size="md"
      fullWidth={fullWidth}
      onClick={onClick}
      className={`add-event-button ${className}`}
    >
      {children}
    </Button>
  )
}

interface PauseSeasonButtonProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

export function PauseSeasonButton({
  children = '⏸ Pause for Season',
  className = '',
  onClick
}: PauseSeasonButtonProps) {
  return (
    <Button
      variant="secondary-admin"
      size="md"
      fullWidth={true}
      onClick={onClick}
      className={`pause-season-button ${className}`}
    >
      {children}
    </Button>
  )
}

interface DeleteMarketButtonProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

export function DeleteMarketButton({
  children = 'Delete Market',
  className = '',
  onClick
}: DeleteMarketButtonProps) {
  return (
    <Button
      variant="danger"
      size="md"
      fullWidth={true}
      onClick={onClick}
      className={`delete-market-button ${className}`}
    >
      {children}
    </Button>
  )
}
