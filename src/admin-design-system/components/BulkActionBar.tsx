import { type ReactNode } from 'react'

interface BulkActionBarProps {
  /** Number of selected items */
  selectedCount: number
  /** Whether the bar is visible/active */
  visible?: boolean
  /** Primary action buttons */
  actions?: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * BulkActionBar - Floating bottom action bar for multi-select operations
 * 
 * WHY: From wireframes - allows bulk operations (like weather cancellations)
 * without blocking content. Uses slide-up animation and existing design tokens.
 * Dark background provides strong contrast for important bulk actions.
 */
export function BulkActionBar({ 
  selectedCount,
  visible = true,
  actions,
  className = ''
}: BulkActionBarProps) {
  
  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'var(--space-md)',
    left: '50%',
    background: 'var(--deep-navy)',
    color: 'white',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 150,
    fontFamily: 'var(--font-display)',
    transition: 'transform 0.3s ease',
    gap: 'var(--space-md)',
    // Ensure it works on mobile
    maxWidth: '500px',
    margin: '0 auto',
    transform: visible
      ? 'translateX(-50%) translateY(0)'
      : 'translateX(-50%) translateY(100px)'
  }

  const countStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    flex: 'none'
  }

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-xs)',
    alignItems: 'center'
  }

  const closeButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    cursor: 'default',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-display)'
  }

  if (!visible && selectedCount === 0) {
    return null
  }

  return (
    <div 
      className={`bulk-action-bar ${className}`}
      style={barStyle}
    >
      <span style={countStyle}>
        {selectedCount} selected
      </span>
      
      <div style={actionsStyle}>
        {actions}
        <div style={closeButtonStyle}>
          ✕
        </div>
      </div>
    </div>
  )
}

// Specialized action buttons for bulk operations

interface BulkActionButtonProps {
  /** Button text */
  children: ReactNode
  /** Button variant - danger for destructive actions */
  variant?: 'primary' | 'danger'
  /** Additional CSS classes */
  className?: string
}

/**
 * BulkActionButton - Specialized button for bulk action bar
 * 
 * WHY: Consistent styling for bulk operations. Danger variant for
 * destructive actions like "Cancel Markets"
 */
export function BulkActionButton({
  children,
  variant = 'primary',
  className = ''
}: BulkActionButtonProps) {
  
  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'default',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-display)',
    ...(variant === 'danger' ? {
      background: 'var(--coral)',
      color: 'white'
    } : {
      background: 'var(--ocean-blue)',
      color: 'white'
    })
  }

  return (
    <div
      className={`bulk-action-button bulk-action-button--${variant} ${className}`}
      style={buttonStyle}
    >
      {children}
    </div>
  )
}

// TODO: Add slide animation variants (slide up from different directions)
// TODO: Add haptic feedback integration for mobile
// TODO: Consider adding confirmation dialogs for destructive bulk actions
// TODO: Add keyboard shortcuts display (Cmd+A, Delete, etc.)