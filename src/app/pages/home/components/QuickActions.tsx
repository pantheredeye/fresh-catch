import { NavGrid } from '@/design-system'
import type { NavGridItem } from '@/design-system'

type QuickAction = {
  icon: string
  title: string
  href: string
}

interface QuickActionsProps {
  actions: QuickAction[]
}

/**
 * QuickActions - Wrapper for NavGrid with customer quick actions styling
 *
 * WHY: Thin wrapper around design system NavGrid component.
 * Maintains API compatibility with existing CustomerHomeUI.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  // Convert QuickAction to NavGridItem format
  const navItems: NavGridItem[] = actions.map(action => ({
    icon: action.icon,
    title: action.title,
    href: action.href
  }))

  return (
    <div style={{
      padding: '0 var(--space-md) var(--space-xl)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <NavGrid items={navItems} columns={2} variant="compact" />
    </div>
  )
}
