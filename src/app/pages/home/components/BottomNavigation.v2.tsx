'use client';

import { useEffect, useState } from 'react';
import { NavItem } from './NavItem';

/**
 * BottomNavigation V2 - Bottom nav with prominent Quick Order CTA
 *
 * WHY: Promotes quick ordering as primary action.
 * Quick Order button styled prominently in center.
 * Reduced nav items to Home, Markets, More.
 */
export function BottomNavigationV2() {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector('.customer-footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      bottom: footerVisible ? '100px' : 'var(--space-md)',
      left: 'var(--space-md)',
      right: 'var(--space-md)',
      background: 'var(--surface-primary)',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 200,
      border: '1px solid rgba(0,102,204,0.08)',
      transition: 'bottom 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 'var(--space-sm)',
        gap: 'var(--space-xs)'
      }}>
        <NavItem label="Home" active />

        {/* Quick Order - Prominent CTA */}
        <button style={{
          background: 'var(--ocean-blue)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: 'var(--space-sm) var(--space-lg)',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,102,204,0.3)',
          transition: 'all 0.2s ease',
          flex: '1',
          maxWidth: '140px'
        }}>
          🛒 Quick Order
        </button>

        <NavItem label="Markets" />
        <NavItem label="More" />
      </div>
    </nav>
  );
}
