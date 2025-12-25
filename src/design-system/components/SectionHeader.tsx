import { type ReactNode } from 'react'

interface SectionHeaderProps {
  /** Header text content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Optional action element (like a button or link) */
  action?: ReactNode
}

/**
 * SectionHeader - Grouping header for admin content sections
 * 
 * WHY: From wireframes - organizes content by status/date with subtle styling.
 * Uses existing design tokens for consistency. Uppercase lettering with
 * generous spacing for clear content separation.
 */
export function SectionHeader({ 
  children, 
  className = '',
  action
}: SectionHeaderProps) {
  
  const headerStyle: React.CSSProperties = {
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--light-gray)',
    fontSize: '12px',
    color: 'var(--cool-gray)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 600,
    borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
    fontFamily: 'var(--font-display)',
    display: action ? 'flex' : 'block',
    justifyContent: action ? 'space-between' : 'flex-start',
    alignItems: action ? 'center' : 'stretch'
  }

  return (
    <div 
      className={`section-header ${className}`}
      style={headerStyle}
    >
      <span>{children}</span>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  )
}

// Specialized variants for common admin patterns

interface DateHeaderProps {
  /** Date string (e.g., "Today • Saturday, Nov 2", "Tuesday, Nov 5") */
  date: string
  /** Additional CSS classes */
  className?: string
}

/**
 * DateHeader - Specialized section header for schedule operations
 * 
 * WHY: From schedule wireframes - chronological grouping of market instances
 * by date. Same styling as SectionHeader but semantic naming.
 */
export function DateHeader({ 
  date, 
  className = '' 
}: DateHeaderProps) {
  return (
    <SectionHeader className={`date-header ${className}`}>
      {date}
    </SectionHeader>
  )
}

// TODO: Add StatusHeader variant for Active/Paused grouping with counts
// TODO: Add collapsible section header variant
// TODO: Consider adding subtle icons for different section types