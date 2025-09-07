import { ReactNode } from 'react'
import { NotificationBadge } from './Badge'

export interface NavItem {
  label: string
  href: string
  isActive?: boolean
  badge?: string | number
}

export interface BottomNavProps {
  items: NavItem[]
  className?: string
}

export function BottomNav({ items, className = '' }: BottomNavProps) {
  const navStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'var(--space-md)',
    left: 'var(--space-md)',
    right: 'var(--space-md)',
    background: 'var(--surface-primary)',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 200,
    border: '1px solid rgba(0,102,204,0.08)'
  }

  const navItemsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 'var(--space-sm)'
  }

  const getNavItemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: 'var(--space-sm) var(--space-md)',
    textDecoration: 'none',
    color: isActive ? 'white' : 'var(--cool-gray)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s ease',
    borderRadius: 'var(--radius-full)',
    background: isActive ? 'var(--ocean-gradient)' : 'transparent',
    boxShadow: isActive ? 'var(--shadow-md)' : 'none'
  })

  return (
    <nav className={`bottom-nav ${className}`} style={navStyle}>
      <div className="nav-items" style={navItemsStyle}>
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={`nav-item ${item.isActive ? 'active' : ''}`}
            style={getNavItemStyle(item.isActive || false)}
          >
            {item.label}
            {item.badge && (
              <NotificationBadge 
                position="top-right" 
                offset="-4px"
                size="sm"
              >
                {item.badge}
              </NotificationBadge>
            )}
          </a>
        ))}
      </div>
    </nav>
  )
}