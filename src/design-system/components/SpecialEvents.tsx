import { ReactNode } from 'react'
import { SpecialEventCard } from './SpecialEventCard'

export interface SpecialEvent {
  name: string
  date: string
  time: string
  variant?: 'ghost' | 'coral'
  pinHref?: string
  onPin?: () => void
}

export interface SpecialEventsProps {
  events: SpecialEvent[]
  className?: string
}

/**
 * SpecialEvents - Container for bonus/special market locations
 * 
 * WHY: Sits between Your Markets (primary) and Quick Actions (utility)
 * in the priority hierarchy. Single column list with ghost styling
 * signals "bonus market" discovery content.
 */
export function SpecialEvents({ events, className = '' }: SpecialEventsProps) {
  if (!events || events.length === 0) {
    return null
  }

  const containerStyle: React.CSSProperties = {
    padding: '0 var(--space-md) var(--space-lg)',
    maxWidth: '500px',
    margin: '0 auto'
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: 'var(--space-md)'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--deep-navy)',
    margin: 0
  }

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column'
  }

  return (
    <div className={`special-events ${className}`} style={containerStyle}>
      <div className="special-events-header" style={headerStyle}>
        <h3 className="special-events-title" style={titleStyle}>Special Events This Week</h3>
      </div>
      <div className="special-events-list" style={listStyle}>
        {events.map((event, index) => (
          <SpecialEventCard
            key={index}
            name={event.name}
            date={event.date}
            time={event.time}
            variant={event.variant}
            pinHref={event.pinHref}
            onPin={event.onPin}
          />
        ))}
      </div>
    </div>
  )
}