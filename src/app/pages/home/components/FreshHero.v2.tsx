import { NavGrid } from '@/design-system'
import type { NavGridItem } from '@/design-system'

type FreshCatch = {
  emoji: string;
  name: string;
};

type QuickAction = {
  icon: string;
  title: string;
  href: string;
};

interface FreshHeroV2Props {
  freshCatch: FreshCatch[];
  actions: QuickAction[];
}

/**
 * FreshHero V2 - Hero section with fresh catch + integrated quick actions
 *
 * WHY: Consolidates hero content and quick actions into single visual block.
 * Ocean gradient background with glassmorphic cards for premium feel.
 * Combines fresh catch grid with quick action buttons.
 */
export function FreshHeroV2({ freshCatch, actions }: FreshHeroV2Props) {
  // Convert QuickAction to NavGridItem format
  const navItems: NavGridItem[] = actions.map(action => ({
    icon: action.icon,
    title: action.title,
    href: action.href
  }))

  return (
    <div style={{
      width: 'calc(100% - var(--space-md) * 2)',
      maxWidth: 'var(--width-md)',
      margin: 'var(--space-md) auto',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      background: 'var(--ocean-gradient)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
      color: 'white'
    }} className="fresh-section">

      <div style={{
        position: 'relative',
        zIndex: 1,
        marginBottom: 'var(--space-lg)'
      }}>
        <div style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          opacity: 0.9,
          marginBottom: 'var(--space-sm)'
        }}>
          This Week's Catch
        </div>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}>
          Fresh from the Gulf
        </h2>
      </div>

      {/* Fresh Catch Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-sm)',
        position: 'relative',
        zIndex: 1,
        marginBottom: 'var(--space-lg)'
      }}>
        {freshCatch.map((item, index) => (
          <div key={index} style={{
            background: 'var(--glass-white)',
            color: 'var(--deep-navy)',
            padding: 'var(--space-md) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <span style={{
              display: 'block',
              fontSize: '28px',
              marginBottom: 'var(--space-xs)',
              filter: 'saturate(1.2)'
            }}>
              {item.emoji}
            </span>
            {item.name}
          </div>
        ))}
      </div>

      {/* Quick Actions - integrated into hero */}
      <div style={{
        position: 'relative',
        zIndex: 1
      }}>
        <NavGrid items={navItems} columns={2} variant="compact" />
      </div>
    </div>
  );
}
