import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  isFavorite?: boolean
  className?: string
  onClick?: () => void
}

/**
 * Card - Market card with glassmorphism and proper spacing
 * 
 * WHY: From customer.html - cards with colored shadows feel premium.
 * Single drop shadow feels grounded (not floating).
 * Favorite indicator adds market personality.
 */
export function Card({ children, isFavorite = false, className = '', onClick }: CardProps) {
  const cardStyle: React.CSSProperties = {
    background: isFavorite 
      ? 'linear-gradient(135deg, white, rgba(0,217,177,0.03))'
      : 'white',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)',
    marginBottom: 'var(--space-md)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid rgba(0,102,204,0.08)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    cursor: onClick ? 'pointer' : 'default'
  }

  return (
    <div 
      className={`card ${className}`}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
    >
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