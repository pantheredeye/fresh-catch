import { type ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Container - Mobile-first wrapper component
 * 
 * WHY: Solves the "fake phone container" problem by using natural responsive design.
 * - Mobile-first: Full width on mobile with padding
 * - Desktop: Max-width centered to prevent card stretching
 * - No artificial phone boundaries or constraints
 */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div 
      className={`container ${className}`}
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: 'var(--space-md)',
        width: '100%'
      }}
    >
      {children}
    </div>
  )
}

// TODO: Add responsive breakpoints if needed:
// - Mobile: full width with padding
// - Tablet: max-width 768px
// - Desktop: max-width 500px (keeps mobile-first feel)