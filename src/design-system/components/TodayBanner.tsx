import { type ReactNode } from 'react'

interface TodayBannerProps {
  children: ReactNode
  isLive?: boolean
  className?: string
}

/**
 * TodayBanner - Live indicator banner with pulsing dot
 * 
 * WHY: From customer.html - mint-fresh background creates energy and excitement.
 * Pulsing dot animation shows real-time status. Simple but effective at
 * communicating "happening now" energy that drives urgency.
 */
export function TodayBanner({ children, isLive = true, className = '' }: TodayBannerProps) {
  const bannerStyle: React.CSSProperties = {
    background: 'var(--mint-fresh)',
    color: 'white',
    padding: 'var(--space-sm)',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)'
  }

  return (
    <div className={`today-banner ${className}`} style={bannerStyle}>
      {isLive && <LiveDot />}
      <span>{children}</span>
    </div>
  )
}

/**
 * LiveDot - Animated pulsing dot for live status
 * 
 * WHY: Visual indicator that something is happening right now.
 * Animation draws attention without being annoying.
 */
export function LiveDot({ className = '' }: { className?: string }) {
  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    background: 'white',
    borderRadius: '50%',
    boxShadow: '0 0 0 2px rgba(255,255,255,0.3)',
    animation: 'live-pulse 2s ease-in-out infinite'
  }

  return <span className={`live-dot ${className}`} style={dotStyle} />
}

// TODO: Add option for different status colors (red for urgent, yellow for warning)
// TODO: Add sound notification option for live updates
// TODO: Add countdown timer option for time-sensitive banners