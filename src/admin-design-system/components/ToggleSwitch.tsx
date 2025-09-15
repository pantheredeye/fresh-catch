import { type ReactNode } from 'react'

interface ToggleSwitchProps {
  /** Current active state */
  active?: boolean
  /** Size variant - compact for tight spaces */
  size?: 'default' | 'compact'
  /** Additional CSS classes */
  className?: string
  /** Optional label to display next to toggle */
  label?: ReactNode
  /** Disabled state */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
}

/**
 * ToggleSwitch - Core admin control for enable/disable states
 * 
 * WHY: Used everywhere in admin interface for market active/paused states.
 * Uses existing design tokens for visual consistency with customer components.
 * Compact variant for space-efficient layouts.
 */
export function ToggleSwitch({
  active = false,
  size = 'default',
  className = '',
  label,
  disabled = false,
  onClick
}: ToggleSwitchProps) {
  
  const sizeStyles = {
    default: {
      width: '51px',
      height: '31px',
      knobSize: '27px',
      knobOffset: '2px',
      activeOffset: '20px'
    },
    compact: {
      width: '44px',
      height: '24px', 
      knobSize: '20px',
      knobOffset: '2px',
      activeOffset: '18px'
    }
  }
  
  const currentSize = sizeStyles[size]
  
  const toggleStyle: React.CSSProperties = {
    width: currentSize.width,
    height: currentSize.height,
    background: active ? 'var(--mint-fresh)' : 'var(--light-gray)',
    borderRadius: 'var(--radius-full)',
    position: 'relative',
    cursor: disabled ? 'not-allowed' : (onClick ? 'pointer' : 'default'),
    transition: 'all 0.3s ease',
    flexShrink: 0,
    opacity: disabled ? 0.5 : 1,
    boxShadow: active ? '0 4px 12px rgba(0, 217, 177, 0.2)' : 'none',
    border: active ? 'none' : '1px solid rgba(100, 116, 139, 0.2)',
    transform: 'scale(1)'
  }

  const knobStyle: React.CSSProperties = {
    content: '',
    position: 'absolute',
    width: currentSize.knobSize,
    height: currentSize.knobSize,
    background: 'white',
    borderRadius: '50%',
    top: currentSize.knobOffset,
    left: currentSize.knobOffset,
    transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-sm)',
    transform: active ? `translateX(${currentSize.activeOffset})` : 'translateX(0)'
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    cursor: 'default'
  }

  const toggleElement = (
    <div
      className={`toggle-switch ${active ? 'active' : ''} ${className}`}
      style={toggleStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        if (!disabled && onClick) {
          e.currentTarget.style.transform = 'scale(1.05)'
          if (active) {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 217, 177, 0.3)'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)'
          if (active) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 217, 177, 0.2)'
          }
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && onClick) {
          e.currentTarget.style.transform = 'scale(0.95)'
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && onClick) {
          e.currentTarget.style.transform = 'scale(1.05)'
        }
      }}
    >
      <div style={knobStyle} />
    </div>
  )

  // If no label, return just the toggle
  if (!label) {
    return toggleElement
  }

  // With label, return container
  return (
    <div style={containerStyle}>
      {toggleElement}
      <span
        style={{
          fontSize: '14px',
          color: 'var(--deep-navy)',
          fontWeight: 500,
          userSelect: 'none',
          opacity: disabled ? 0.5 : 1
        }}
      >
        {label}
      </span>
    </div>
  )
}

// Specialized variants for common use cases

interface MarketToggleProps {
  /** Market active state */
  active?: boolean
  /** Market name for accessibility */
  marketName?: string
  /** Disabled state */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
}

/**
 * MarketToggle - Specialized toggle for market active/paused states
 * 
 * WHY: Common pattern in admin interface, adds proper accessibility labels
 */
export function MarketToggle({
  active = false,
  marketName = 'market',
  disabled = false,
  onClick
}: MarketToggleProps) {
  return (
    <ToggleSwitch
      active={active}
      size="compact"
      disabled={disabled}
      onClick={onClick}
      className="market-toggle"
    />
  )
}