import { type ReactNode } from 'react'

interface AdminButtonProps {
  children: ReactNode
  variant?: 'cancel' | 'danger' | 'secondary-admin' | 'add-event'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  href?: string
  disabled?: boolean
}

/**
 * AdminButton - Extended button variants for admin interface
 * 
 * WHY: Extends the existing button system with admin-specific variants.
 * Uses same design tokens and patterns but adds admin-focused styling
 * like cancel (coral), danger (coral), and add-event (primary) variants.
 */
export function AdminButton({ 
  children, 
  variant = 'cancel', 
  size = 'md', 
  fullWidth = false,
  className = '',
  href,
  disabled = false
}: AdminButtonProps) {
  
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
      fontWeight: 600,
    },
    lg: {
      fontSize: '18px',
      padding: '16px 24px',
      fontWeight: 700,
      minHeight: '48px'
    }
  }

  const variantStyles = {
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
    cursor: 'default',
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
        className={`admin-btn admin-btn--${variant} admin-btn--${size} ${className}`}
        style={baseStyles}
      >
        {children}
      </a>
    )
  }

  return (
    <div
      className={`admin-btn admin-btn--${variant} admin-btn--${size} ${className}`}
      style={baseStyles}
    >
      {children}
    </div>
  )
}

// Specialized admin button variants for common use cases

interface CancelButtonProps {
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * CancelButton - Quick cancel action for market instances
 * 
 * WHY: From wireframes - consistent "Cancel" button next to market instances
 */
export function CancelButton({ 
  children = 'Cancel', 
  size = 'sm',
  className = '' 
}: CancelButtonProps) {
  return (
    <AdminButton
      variant="cancel"
      size={size}
      className={`cancel-button ${className}`}
    >
      {children}
    </AdminButton>
  )
}

interface AddEventButtonProps {
  children?: ReactNode
  className?: string
  fullWidth?: boolean
}

/**
 * AddEventButton - Primary CTA for adding special events
 * 
 * WHY: From schedule wireframes - prominent button for adding special events
 */
export function AddEventButton({ 
  children = '+ Add Special Event', 
  className = '',
  fullWidth = true
}: AddEventButtonProps) {
  return (
    <AdminButton
      variant="add-event"
      size="md"
      fullWidth={fullWidth}
      className={`add-event-button ${className}`}
    >
      {children}
    </AdminButton>
  )
}

interface PauseSeasonButtonProps {
  children?: ReactNode
  className?: string
}

/**
 * PauseSeasonButton - Secondary action for seasonal market pausing
 * 
 * WHY: From market config wireframes - allows pausing markets for seasons
 */
export function PauseSeasonButton({ 
  children = '⏸ Pause for Season', 
  className = ''
}: PauseSeasonButtonProps) {
  return (
    <AdminButton
      variant="secondary-admin"
      size="md"
      fullWidth={true}
      className={`pause-season-button ${className}`}
    >
      {children}
    </AdminButton>
  )
}

interface DeleteMarketButtonProps {
  children?: ReactNode
  className?: string
}

/**
 * DeleteMarketButton - Destructive action for market deletion
 * 
 * WHY: From market config wireframes - clearly dangerous action styling
 */
export function DeleteMarketButton({ 
  children = 'Delete Market', 
  className = ''
}: DeleteMarketButtonProps) {
  return (
    <AdminButton
      variant="danger"
      size="md"
      fullWidth={true}
      className={`delete-market-button ${className}`}
    >
      {children}
    </AdminButton>
  )
}

// TODO: Add loading states for async operations
// TODO: Add confirmation dialog integration for destructive actions  
// TODO: Add keyboard shortcut display on hover
// TODO: Consider adding admin button groups for related actions