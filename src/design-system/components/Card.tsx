import { type ReactNode, type CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  isFavorite?: boolean
  className?: string
  onClick?: () => void
  variant?: 'default' | 'centered'
  maxWidth?: string
}

/**
 * Card - Flexible card component for design system
 *
 * WHY: Used across app for market cards, auth forms, centered content
 *
 * VARIANTS:
 * - default: Market card with margins (list items)
 * - centered: Auth/form card, vertically centered on page
 *
 * PROPS:
 * - isFavorite: Adds star indicator (market cards)
 * - maxWidth: Custom max-width (auth cards)
 * - onClick: Makes card clickable
 */
export function Card({
  children,
  isFavorite = false,
  className = '',
  onClick,
  variant = 'default',
  maxWidth
}: CardProps) {
  const cardStyle: CSSProperties = {
    background: isFavorite
      ? 'var(--surface-favorite)'
      : 'var(--surface-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: variant === 'centered' ? 'var(--space-md)' : 'var(--space-lg)',
    marginBottom: variant === 'default' ? 'var(--space-md)' : '0',
    boxShadow: variant === 'centered' ? 'var(--shadow-lg)' : 'var(--shadow-md)',
    border: '1px solid rgba(100, 116, 139, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    cursor: onClick ? 'pointer' : 'default',
    width: '100%',
    maxWidth: maxWidth || '100%'
  }

  const wrapperStyle: CSSProperties =
    variant === 'centered'
      ? {
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-sm)'
        }
      : {}

  const cardContent = (
    <div className={`card ${className}`} style={cardStyle} onClick={onClick}>
      {isFavorite && (
        <span
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-md)',
            fontSize: '20px'
          }}
        >
          ⭐
        </span>
      )}
      {children}
    </div>
  )

  if (variant === 'centered') {
    return <div style={wrapperStyle}>{cardContent}</div>
  }

  return cardContent
}

interface CardTitleProps {
  children: ReactNode
}

export function CardTitle({ children }: CardTitleProps) {
  return (
    <h3
      style={{
        fontSize: '20px',
        fontWeight: 700,
        color: 'var(--deep-navy)',
        marginBottom: 'var(--space-xs)',
        margin: 0
      }}
    >
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: ReactNode
}

export function CardContent({ children }: CardContentProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        marginBottom: 'var(--space-lg)'
      }}
    >
      {children}
    </div>
  )
}

// TODO: Add torn-paper edge effect
// TODO: Add wave pattern dividers
// TODO: Add subtle grain texture option