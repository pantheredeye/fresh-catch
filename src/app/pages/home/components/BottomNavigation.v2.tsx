'use client';

import { useEffect, useState } from 'react';
import { NavItem } from './NavItem';
import { ShareModal } from '@/design-system';
import { getCurrentOrgShareUrl } from '@/utils/share';
import { trackShare } from '../share-functions';

/**
 * BottomNavigation V2 - Bottom nav with prominent Quick Order CTA
 *
 * WHY: Promotes quick ordering as primary action.
 * Quick Order button styled prominently in center.
 * Reduced nav items to Home, Markets, More.
 */
export function BottomNavigationV2() {
  const [footerVisible, setFooterVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

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

  // Fetch share URL on mount
  useEffect(() => {
    getCurrentOrgShareUrl().then(url => setShareUrl(url)).catch(err => console.error('Failed to get share URL:', err));
  }, []);

  return (
    <>
      {/* Menu dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          bottom: footerVisible ? '160px' : 'calc(var(--space-md) + 60px)',
          right: 'var(--space-md)',
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 201,
          border: '1px solid rgba(0,102,204,0.08)',
          minWidth: '160px',
          overflow: 'hidden',
          transition: 'bottom 0.3s ease'
        }}>
          <a href="/profile" style={{
            display: 'block',
            padding: 'var(--space-md)',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            borderBottom: '1px solid rgba(0,102,204,0.08)'
          }}>
            Profile
          </a>
          <a href="/settings" style={{
            display: 'block',
            padding: 'var(--space-md)',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            borderBottom: '1px solid rgba(0,102,204,0.08)'
          }}>
            Settings
          </a>
          <button
            onClick={() => {
              setMenuOpen(false);
              setShareModalOpen(true);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: 'var(--space-md)',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            🔗 Share Fresh Catch
          </button>
        </div>
      )}

      {/* Backdrop to close menu */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199
          }}
        />
      )}

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
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}>
            Quick Order
          </a>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              textDecoration: 'none',
              color: 'var(--cool-gray)',
              fontSize: '18px',
              fontWeight: 600,
              borderRadius: 'var(--radius-full)',
              background: 'var(--glass-light)',
              border: '1px solid var(--glass-border-light)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer'
            }}
          >
            ⋯
          </button>
        </div>
      </nav>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        title="Fresh Catch Seafood Markets"
        description="Share our marketplace with friends and family"
        onShareAction={(shareType) => trackShare(shareType)}
      />
    </>
  );
}
