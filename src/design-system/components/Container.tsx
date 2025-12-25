import { type ReactNode, type CSSProperties } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  noPadding?: boolean
}

/**
 * Container - Mobile-first wrapper component
 *
 * WHY: Consistent max-widths across app, full mobile, constrained desktop
 *
 * SIZES:
 * - sm (450px): Auth forms, focused single-task flows
 * - md (800px): Content pages, readable line length
 * - lg (1200px): Dashboards, admin/customer layouts (default)
 * - xl (1400px): Wide layouts, data tables
 *
 * BEHAVIOR:
 * - Mobile: Full width with padding (responsive)
 * - Desktop: Max-width centered to prevent stretching
 */
export function Container({
  children,
  className = '',
  size = 'lg',
  noPadding = false
}: ContainerProps) {
  const maxWidth = {
    sm: 'var(--width-sm)',
    md: 'var(--width-md)',
    lg: 'var(--width-lg)',
    xl: 'var(--width-xl)'
  }[size]

  const style: CSSProperties = {
    maxWidth,
    margin: '0 auto',
    padding: noPadding ? '0' : 'var(--space-md)',
    width: '100%',
    minWidth: '0' // Prevents flex/grid from enforcing min-width
  }

  return (
    <div className={`container ${className}`} style={style}>
      {children}
    </div>
  )
}