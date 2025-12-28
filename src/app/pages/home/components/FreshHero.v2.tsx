import { NavGrid } from '@/design-system'
import type { NavGridItem } from '@/design-system'

type QuickAction = {
  icon: string;
  title: string;
  href: string;
};

interface FreshHeroV2Props {
  actions: QuickAction[];
}

/**
 * FreshHero V2 - Hero section with quick actions only
 *
 * WHY: Simplified hero focusing on action buttons.
 * Ocean gradient background with glassmorphic cards for premium feel.
 * Quick action buttons for key customer tasks.
 */
export function FreshHeroV2({ actions }: FreshHeroV2Props) {
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
        marginBottom: 'var(--space-md)'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          fontFamily: 'var(--font-display)',
          textAlign: 'center'
        }}>
          Fresh from the Gulf
        </h2>
      </div>

      {/* Quick Actions */}
      <div style={{
        position: 'relative',
        zIndex: 1
      }}>
        <NavGrid items={navItems} columns={2} variant="compact" />
      </div>
    </div>
  );
}
