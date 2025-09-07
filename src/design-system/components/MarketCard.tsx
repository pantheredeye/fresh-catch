import { type ReactNode } from 'react'
import { Card } from './Card'
import { Button } from './Button'

interface MarketCardProps {
  name: string
  date: string
  time: string
  distance: string
  isFavorite?: boolean
  className?: string
  onOrder?: () => void
  onPin?: () => void
  orderHref?: string
  pinHref?: string
}

/**
 * MarketCard - Specialized card for farmer's market listings
 * 
 * WHY: From customer.html - wider primary button matches the visual design.
 * Pin icon gives users quick access to location/directions.
 * Glass morphism background for favorites adds premium feel.
 */
export function MarketCard({
  name,
  date,
  time,
  distance,
  isFavorite = false,
  className = '',
  onOrder,
  onPin,
  orderHref,
  pinHref
}: MarketCardProps) {
  return (
    <Card isFavorite={isFavorite} className={`market-card ${className}`}>
      <MarketName>{name}</MarketName>
      <MarketDetails>
        <MarketDate>{date}</MarketDate>
        <MarketTime>{time}</MarketTime>
        <MarketDistance>{distance}</MarketDistance>
      </MarketDetails>
      <MarketActions>
        <Button 
          variant="primary" 
          size="md" 
          fullWidth
          href={orderHref}
          onClick={onOrder}
        >
          Order Fish
        </Button>
        <PinButton 
          href={pinHref}
          onClick={onPin}
        />
      </MarketActions>
    </Card>
  )
}

interface MarketNameProps {
  children: ReactNode
}

export function MarketName({ children }: MarketNameProps) {
  return (
    <div
      style={{
        fontSize: '20px',
        fontWeight: 700,
        color: 'var(--deep-navy)',
        marginBottom: 'var(--space-xs)'
      }}
    >
      {children}
    </div>
  )
}

interface MarketDetailsProps {
  children: ReactNode
}

export function MarketDetails({ children }: MarketDetailsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        marginBottom: 'var(--space-lg)'
      }}
    >
      {children}
    </div>
  )
}

interface MarketDateProps {
  children: ReactNode
}

export function MarketDate({ children }: MarketDateProps) {
  return (
    <span
      style={{
        color: 'var(--ocean-blue)',
        fontWeight: 600,
        fontSize: '16px'
      }}
    >
      {children}
    </span>
  )
}

interface MarketTimeProps {
  children: ReactNode
}

export function MarketTime({ children }: MarketTimeProps) {
  return (
    <span
      style={{
        color: 'var(--cool-gray)',
        fontSize: '14px'
      }}
    >
      {children}
    </span>
  )
}

interface MarketDistanceProps {
  children: ReactNode
}

export function MarketDistance({ children }: MarketDistanceProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: 'var(--light-gray)',
        padding: 'var(--space-xs) var(--space-sm)',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--cool-gray)',
        marginTop: 'var(--space-xs)'
      }}
    >
      {children}
    </span>
  )
}

interface MarketActionsProps {
  children: ReactNode
}

export function MarketActions({ children }: MarketActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}
    >
      {children}
    </div>
  )
}

interface PinButtonProps {
  href?: string
  onClick?: () => void
  className?: string
}

/**
 * PinButton - Location/directions icon button
 * 
 * WHY: From customer.html - 56px square button with location pin icon.
 * Provides quick access to directions or map view.
 */
export function PinButton({ href, onClick, className = '' }: PinButtonProps) {
  const buttonStyle: React.CSSProperties = {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--light-gray)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontSize: '24px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: 'none'
  }

  const content = '📍'

  if (href) {
    return (
      <a
        href={href}
        className={`btn-icon pin-button ${className}`}
        style={buttonStyle}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`btn-icon pin-button ${className}`}
      style={buttonStyle}
    >
      {content}
    </button>
  )
}

// TODO: Add hover effects for pin button (slight scale up)
// TODO: Add map integration options
// TODO: Add driving directions integration