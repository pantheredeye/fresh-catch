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
      color: active ? 'white' : 'var(--cool-gray)',
      fontSize: '13px',
      fontWeight: 600,
      position: 'relative',
      transition: 'all 0.3s ease',
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--ocean-gradient)' : 'rgba(255,255,255,0.1)',
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
          background: 'var(--coral)',
          color: 'white',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 700
        }}>
          {badge}
        </span>
      )}
    </a>
  );
}
