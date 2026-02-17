import { type ReactNode } from 'react'

export interface NavGridItem {
  icon: string
  title: string
  description?: string
  href: string
}

interface NavGridProps {
  items: NavGridItem[]
  columns?: 2 | 3
  variant?: 'compact' | 'detailed'
}

/**
 * NavGrid - Unified navigation card grid
 *
 * WHY: Single component for both customer QuickActions and admin nav
 * Eliminates duplication between customer/admin interfaces
 *
 * VARIANTS:
 * - compact: Icon + title only (customer quick actions)
 * - detailed: Icon + title + description (admin dashboard nav)
 *
 * PROPS:
 * - items: Array of nav items with icon, title, optional description, href
 * - columns: 2 or 3 column grid (default 2)
 * - variant: 'compact' or 'detailed' (default 'compact')
 */
export function NavGrid({ items, columns = 2, variant = 'compact' }: NavGridProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--space-md)',
        width: '100%'
      }}
      className="nav-grid"
      data-columns={columns}
    >
      {items.map((item, index) => (
        <a
          key={index}
          href={item.href}
          style={{
            display: 'flex',
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'center' : 'center',
            gap: isCompact ? 'var(--space-sm)' : 'var(--space-md)',
            background: 'var(--color-surface-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: isCompact ? 'var(--space-lg) var(--space-md)' : 'var(--space-lg)',
            textAlign: isCompact ? 'center' : 'left',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.3s ease',
            border: isCompact
              ? `2px solid ${getColorBorder(index)}`
              : '2px solid var(--color-border-subtle)',
            minHeight: isCompact ? 'auto' : '120px',
            cursor: 'pointer'
          }}
          className="card"
        >
          {/* Icon */}
          <div
            style={{
              fontSize: isCompact ? '32px' : '48px',
              flexShrink: 0,
              filter: isCompact ? 'saturate(1.5)' : undefined
            }}
          >
            {item.icon}
          </div>

          {/* Content */}
          <div
            style={{
              flex: isCompact ? undefined : 1,
              minWidth: 0
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: isCompact ? '14px' : '20px',
                fontFamily: 'var(--font-display)',
                marginBottom: item.description ? 'var(--space-xs)' : 0
              }}
            >
              {item.title}
            </div>
            {item.description && (
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4,
                  margin: 0
                }}
              >
                {item.description}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

// Color-coded borders for compact variant (customer quick actions)
function getColorBorder(index: number): string {
  const colors = [
    'rgba(0,102,204,0.2)',   // Ocean blue
    'rgba(255,107,107,0.2)', // Coral
    'rgba(0,217,177,0.2)',   // Mint
    'rgba(255,179,102,0.2)'  // Gold
  ]
  return colors[index % colors.length]
}
