import { type ReactNode } from 'react'
import { MarketToggle } from './ToggleSwitch'

interface CompactMarketCardProps {
  /** Market name (short version for compact display) */
  name: string
  /** Compact schedule format (e.g., "Sat 8-2", "Tue 3-6:30") */
  schedule: string
  /** Market active state */
  active?: boolean
  /** Additional content for the card */
  children?: ReactNode
  /** CSS class name */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Market is paused (visual styling) */
  paused?: boolean
  /** Click handler for editing market */
  onEdit?: () => void
}

/**
 * CompactMarketCard - Space-efficient market list item for admin interface
 * 
 * WHY: Mobile-first compact layout from wireframes. Perfect information density
 * for scanning multiple markets quickly. Uses existing design tokens for consistency.
 * Responsive design without phone container constraints.
 */
export function CompactMarketCard({
  name,
  schedule,
  active = true,
  children,
  className = '',
  disabled = false,
  paused = false,
  onEdit
}: CompactMarketCardProps) {

  const cardStyle: React.CSSProperties = {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: paused ? 'var(--light-gray)' : 'var(--surface-primary)',
    opacity: paused ? 0.7 : 1,
    transition: 'all 0.2s ease',
    cursor: 'default',
    minHeight: '60px', // Ensure touch-friendly height
    gap: 'var(--space-sm)'
  }

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flex: 1,
    minWidth: 0 // Allow text truncation
  }

  const nameStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--deep-navy)',
    fontFamily: 'var(--font-display)',
    margin: 0,
    // Truncate long names on small screens
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }

  const scheduleStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--cool-gray)',
    fontFamily: 'var(--font-mono)', // Times feel trustworthy
    fontWeight: 500,
    flexShrink: 0 // Don't compress schedule
  }

  return (
    <div
      className={`compact-market-card ${className}`}
      style={cardStyle}
    >
      {/* Left section: Toggle + Market Name */}
      <div style={leftSectionStyle}>
        <MarketToggle
          active={active}
          marketName={name}
          disabled={disabled}
        />
        <div>
          <div style={nameStyle}>{name}</div>
          {children && (
            <div style={{
              fontSize: '12px',
              color: 'var(--cool-gray)',
              marginTop: '2px'
            }}>
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Schedule */}
      <div style={scheduleStyle}>
        {schedule}
      </div>

      {/* Right section: Edit button */}
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-xs)',
            color: 'var(--cool-gray)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontSize: '16px',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--light-gray)';
            e.currentTarget.style.color = 'var(--deep-navy)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--cool-gray)';
          }}
          title="Edit market settings"
        >
          ⚙️
        </button>
      )}
    </div>
  )
}

// Specialized variant for different market states

interface CompactMarketListProps {
  /** Array of markets to display */
  markets: Array<{
    id: string
    name: string
    schedule: string
    active?: boolean
    paused?: boolean
    subtitle?: string
  }>
  /** List is in loading state */
  loading?: boolean
  /** CSS class name */
  className?: string
  /** Click handler for editing a market */
  onEditMarket?: (marketId: string) => void
}

/**
 * CompactMarketList - Container for multiple compact market cards
 * 
 * WHY: Handles the list container behavior, provides consistent spacing
 * and responsive behavior across different screen sizes.
 */
export function CompactMarketList({
  markets,
  loading = false,
  className = '',
  onEditMarket
}: CompactMarketListProps) {

  const listStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(100, 116, 139, 0.1)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)'
  }

  if (loading) {
    return (
      <div style={listStyle} className={className}>
        <div style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--cool-gray)'
        }}>
          Loading markets...
        </div>
      </div>
    )
  }

  if (markets.length === 0) {
    return (
      <div style={listStyle} className={className}>
        <div style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--cool-gray)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)', opacity: 0.3 }}>
            🏪
          </div>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            No markets configured yet
          </div>
          <div style={{ fontSize: '14px' }}>
            Add your first market to start managing your schedule
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={listStyle} className={`compact-market-list ${className}`}>
      {markets.map((market, index) => (
        <CompactMarketCard
          key={market.id}
          name={market.name}
          schedule={market.schedule}
          active={market.active}
          paused={market.paused}
          onEdit={onEditMarket ? () => onEditMarket(market.id) : undefined}
        >
          {market.subtitle}
        </CompactMarketCard>
      ))}
    </div>
  )
}

// TODO: Add section headers for grouping (Active/Paused)
// TODO: Add bulk selection mode
// TODO: Add drag-to-reorder functionality
// TODO: Consider adding swipe actions for quick edit/delete