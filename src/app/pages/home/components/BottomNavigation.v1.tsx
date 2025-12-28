'use client';

import { useEffect, useState } from 'react';
import { NavItem } from './NavItem';

/**
 * BottomNavigation - Fixed bottom navigation bar with smart lifting
 *
 * WHY: Mobile-first navigation pattern for thumb-friendly access.
 * Floating pill design with glassmorphism for modern aesthetic.
 * Lifts up when footer is visible to prevent overlap.
 */
export function BottomNavigationV1() {
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
        padding: 'var(--space-sm)'
      }}>
        <NavItem label="Home" active />
        <NavItem label="Markets" />
        <NavItem label="Orders" badge="3" />
        <NavItem label="More" />
      </div>
    </nav>
  );
}
