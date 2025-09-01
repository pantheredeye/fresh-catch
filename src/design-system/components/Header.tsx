import { type ReactNode } from 'react'

interface HeaderProps {
  title: string
  action?: {
    label: string
    href: string
  }
  children?: ReactNode
}

/**
 * Header - Floating sticky header with glassmorphism
 * 
 * WHY: From customer.html - sticky header with glass effect feels modern and premium.
 * Quick action in header provides immediate access to core functionality.
 */
export function Header({ title, action, children }: HeaderProps) {
  return (
    <header 
      className="header"
      style={{
        background: 'var(--glass-white)',
        backdropFilter: 'blur(20px)',
        padding: 'var(--space-md)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(0,102,204,0.1)'
      }}
    >
      <div 
        className="header-content"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        <h1 
          style={{
            fontSize: '20px',
            fontWeight: 700,
            background: 'var(--ocean-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0
          }}
        >
          {title}
        </h1>
        
        {action && (
          <a
            href={action.href}
            style={{
              padding: 'var(--space-xs) var(--space-md)',
              background: 'var(--coral-gradient)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-coral)',
              transition: 'all 0.3s ease'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = ''
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = ''
            }}
          >
            {action.label}
          </a>
        )}
      </div>
      
      {children}
    </header>
  )
}

// TODO: Add live indicator component as optional child
// TODO: Add mobile menu toggle for navigation if needed