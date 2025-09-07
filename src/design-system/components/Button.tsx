import { type ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Button - Gradient-powered button system with thick borders for confidence
 * 
 * WHY: From Modern Fresh evolution - thick borders + gradients = confidence and Instagram-ready.
 * Primary actions need to stand out in photos and feel premium.
 * Different variants for different hierarchy levels.
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  href,
  onClick,
  disabled = false
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
      padding: '16px 24px',
      fontWeight: 700,
    },
    lg: {
      fontSize: '18px',
      padding: '16px 24px',
      fontWeight: 700,
      minHeight: '48px'
    }
  }

  const variantStyles = {
    primary: {
      background: 'var(--ocean-gradient)',
      color: 'white',
      border: 'none',
      boxShadow: 'var(--shadow-md)',
      // Hover handled by CSS
    },
    secondary: {
      background: 'var(--coral-gradient)',
      color: 'white',
      border: 'none',
      boxShadow: 'var(--shadow-coral)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ocean-blue)',
      border: '2px solid transparent',
      boxShadow: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--ocean-blue)',
      border: '2px solid var(--ocean-blue)', // Thick confident border
      boxShadow: 'none'
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