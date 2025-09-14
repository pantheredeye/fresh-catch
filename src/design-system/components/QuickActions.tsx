import { ReactNode } from 'react'

export interface QuickActionItem {
  icon: string
  title: string
  href: string
}

export interface QuickActionsProps {
  items: QuickActionItem[]
  className?: string
}

export function QuickActions({ items, className = '' }: QuickActionsProps) {
  return (
    <div className={`quick-actions ${className}`}>
      {items.map((item, index) => (
        <a 
          key={index} 
          href={item.href} 
          className="quick-card"
          style={{
            borderColor: getQuickCardBorderColor(index)
          }}
        >
          <div className="quick-icon">{item.icon}</div>
          <div className="quick-title">{item.title}</div>
        </a>
      ))}
      
      <style>{`
        .quick-actions {
          padding: 0 var(--space-md) var(--space-xl);
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
          max-width: 500px;
          margin: 0 auto;
        }

        .quick-card {
          background: var(--surface-primary);
          border-radius: var(--radius-lg);
          padding: var(--space-lg) var(--space-md);
          text-align: center;
          text-decoration: none;
          color: var(--dark);
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
          border: 1px solid rgba(0,102,204,0.08);
          overflow: hidden;
          position: relative;
        }

        .quick-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .quick-card:active {
          transform: scale(0.95);
          box-shadow: none;
        }

        .quick-icon {
          font-size: 32px;
          margin-bottom: var(--space-sm);
          filter: saturate(1.5);
        }

        .quick-title {
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

function getQuickCardBorderColor(index: number): string {
  const colors = [
    'rgba(0,102,204,0.2)', // ocean blue
    'rgba(255,107,107,0.2)', // coral
    'rgba(0,217,177,0.2)', // mint fresh
    'rgba(255,179,102,0.2)' // warm gold
  ]
  return colors[index % colors.length]
}