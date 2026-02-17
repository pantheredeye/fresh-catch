import { type ReactNode } from 'react'

interface FreshHeroProps {
  label?: string
  title: string
  children: ReactNode
  className?: string
}

/**
 * FreshHero - Ocean gradient hero section with this week's catch
 * 
 * WHY: From customer.html - bold gradient background with floating patterns
 * creates premium feel while showcasing fresh products in grid format.
 * Glass morphism cards inside gradient feel Instagram-ready.
 */
export function FreshHero({ 
  label = "This Week's Catch", 
  title, 
  children, 
  className = '' 
}: FreshHeroProps) {
  const heroStyle: React.CSSProperties = {
    // Floating card like customer.html - margin creates the floating effect
    margin: 'var(--space-md)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-xl)',
    background: 'var(--color-gradient-primary)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    color: 'var(--color-text-inverse)'
  }


  const headerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    marginBottom: 'var(--space-lg)'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    opacity: 0.9,
    marginBottom: 'var(--space-sm)',
    margin: 0
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 'var(--space-xs)',
    margin: 0
  }

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1
  }

  return (
    <div className={`fresh-section ${className}`} style={heroStyle}>
      <div className="fresh-header" style={headerStyle}>
        <div className="fresh-label" style={labelStyle}>{label}</div>
        <h2 className="fresh-title" style={titleStyle}>{title}</h2>
      </div>
      
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  )
}

interface FreshGridProps {
  children: ReactNode
  columns?: number
  className?: string
}

export function FreshGrid({ children, columns = 3, className = '' }: FreshGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: 'var(--space-sm)',
    position: 'relative',
    zIndex: 1
  }

  return (
    <div className={`fresh-grid ${className}`} style={gridStyle}>
      {children}
    </div>
  )
}

interface FreshItemProps {
  emoji: string
  children: ReactNode
  className?: string
}

export function FreshItem({ emoji, children, className = '' }: FreshItemProps) {
  const itemStyle: React.CSSProperties = {
    background: 'var(--color-glass-base)',
    color: 'var(--color-text-primary)',
    padding: 'var(--space-md) var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '14px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)'
  }

  const emojiStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '28px',
    marginBottom: 'var(--space-xs)',
    filter: 'saturate(1.2)'
  }

  return (
    <div className={`fresh-item ${className}`} style={itemStyle}>
      <span className="fresh-emoji" style={emojiStyle}>{emoji}</span>
      {children}
    </div>
  )
}

// TODO: Debug FreshHero background pattern not showing - bubbles not visible
// TODO: Check if SVG data URL is being encoded properly in .fresh-pattern
// TODO: Verify float animation keyframes are working - should be 20s infinite
// TODO: Test if background pattern div is positioned correctly with overflow:hidden
// TODO: Compare with working customer.html implementation - white circles should float
// TODO: Add wave pattern background option
// TODO: Add photo background overlay option for hero