interface NavItemProps {
  label: string;
  active?: boolean;
  badge?: string;
}

/**
 * NavItem - Individual navigation item for bottom nav
 *
 * WHY: Reusable nav button with active state and optional badge.
 * Active state uses ocean gradient for visual consistency.
 * Badge for notification counts (orders, messages, etc).
 */
export function NavItem({ label, active = false, badge }: NavItemProps) {
  return (
    <a href={`#${label.toLowerCase()}`} style={{
      padding: 'var(--space-sm) var(--space-md)',
      textDecoration: 'none',
      color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 'var(--font-weight-semibold)',
      position: 'relative',
      transition: 'all 0.3s ease',
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--color-gradient-primary)' : 'rgba(255,255,255,0.1)',
      border: active ? 'none' : '1px solid rgba(255,255,255,0.2)',
      backdropFilter: active ? 'none' : 'blur(10px)',
      boxShadow: active ? 'var(--shadow-md)' : 'none'
    }}>
      {label}
      {badge && (
        <span style={{
          position: 'absolute',
          top: 0,
          right: '8px',
          background: 'var(--color-action-secondary)',
          color: 'var(--color-text-inverse)',
          fontSize: 'var(--font-size-xs)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'var(--font-weight-bold)'
        }}>
          {badge}
        </span>
      )}
    </a>
  );
}
