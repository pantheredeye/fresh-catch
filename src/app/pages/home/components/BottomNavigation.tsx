import { NavItem } from './NavItem';

/**
 * BottomNavigation - Fixed bottom navigation bar
 *
 * WHY: Mobile-first navigation pattern for thumb-friendly access.
 * Floating pill design with glassmorphism for modern aesthetic.
 * Always accessible without scrolling.
 */
export function BottomNavigation() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 'var(--space-md)',
      left: 'var(--space-md)',
      right: 'var(--space-md)',
      background: 'white',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 200,
      border: '1px solid rgba(0,102,204,0.08)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 'var(--space-sm)'
      }}>
        <NavItem label="Home" active />
        <NavItem label="Markets" />
        <NavItem label="Orders" badge="2" />
        <NavItem label="More" />
      </div>
    </nav>
  );
}
