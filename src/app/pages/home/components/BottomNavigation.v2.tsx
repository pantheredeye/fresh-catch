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
        gap: 'var(--space-sm)'
      }}>
        <a href="/" style={{
          padding: 'var(--space-sm) var(--space-md)',
          textDecoration: 'none',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: 'var(--radius-full)',
          background: 'var(--ocean-gradient)',
          boxShadow: 'var(--shadow-md)'
        }}>
          Home
        </a>

        {/* Quick Order - Matches header button style */}
        <a href="#quick-order" style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 'var(--space-xs) var(--space-md)',
          background: 'var(--coral-gradient)',
          color: 'white',
          borderRadius: 'var(--radius-full)',
          fontSize: '15px',
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: 'var(--shadow-coral)',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer'
        }}>
          + Quick Order
        </a>

        <a href="/profile" style={{
          padding: 'var(--space-sm) var(--space-md)',
          textDecoration: 'none',
          color: 'var(--cool-gray)',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          Profile
        </a>
      </div>
    </nav>
  );
}
