import { type ReactNode } from 'react'
import { PinButton } from './MarketCard'

interface SpecialEventCardProps {
  name: string
  date: string
  time: string
  variant?: 'ghost' | 'coral'
  className?: string
  onPin?: () => void
  pinHref?: string
}

/**
 * SpecialEventCard - Ghost-styled card for bonus/special market locations
 * 
 * WHY: "Bonus market feel" with same info structure as regular markets,
 * but ghost styling to signal secondary priority. Pin-only action since
 * users can use header "Quick Order" for purchases.
 */
export function SpecialEventCard({
  name,
  date,
  time,
  variant = 'ghost',
  className = '',
  onPin,
  pinHref
}: SpecialEventCardProps) {
  const isCoralVariant = variant === 'coral'
  const cardStyle = {
    background: isCoralVariant ? 'var(--coral-gradient)' : 'var(--surface-primary)'
  }
  
  const nameStyle = {
    color: isCoralVariant ? 'white' : 'var(--deep-navy)'
  }
  
  const dateStyle = {
    color: isCoralVariant ? 'white' : 'var(--ocean-blue)',
    opacity: isCoralVariant ? 0.9 : 1
  }
  
  const timeStyle = {
    color: isCoralVariant ? 'white' : 'var(--cool-gray)',
    opacity: isCoralVariant ? 0.8 : 1
  }

  return (
    <div className={`special-event-card ${className}`} style={cardStyle}>
      <div className="special-event-content">
        <div className="special-event-info">
          <div className="special-event-name" style={nameStyle}>{name}</div>
          <div className="special-event-details">
            <span className="special-event-date" style={dateStyle}>{date}</span>
            <span className="special-event-time" style={timeStyle}>{time}</span>
          </div>
        </div>
        <PinButton 
          href={pinHref}
          onClick={onPin}
        />
      </div>
      
      <style jsx>{`
        .special-event-card {
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin-bottom: var(--space-sm);
          box-shadow: var(--shadow-sm);
          border: 1px solid rgba(0,102,204,0.08);
          transition: all 0.3s ease;
        }

        .special-event-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .special-event-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-md);
        }

        .special-event-info {
          flex: 1;
        }

        .special-event-name {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: var(--space-xs);
        }

        .special-event-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .special-event-date {
          font-weight: 600;
          font-size: 14px;
        }

        .special-event-time {
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}