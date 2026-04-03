'use client';

import { useEffect, useState } from 'react';
import { ShareModal } from '@/design-system';
import { getCurrentOrgShareUrl } from '@/utils/share';
import { trackShare } from '../share-functions';
import { ChatSheet } from './ChatSheet';

/**
 * BottomNavigation V2 - Bottom nav with Chat, Quick Order, More
 *
 * WHY: Chat replaces Home button; logo in Header handles home navigation.
 * Quick Order button styled prominently in center.
 */
export function BottomNavigationV2({ vendorSlug, organizationId, user }: {
  vendorSlug?: string;
  organizationId?: string;
  user?: { name: string; phone?: string } | null;
} = {}) {
  const [footerVisible, setFooterVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

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
          background: 'var(--color-surface-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 201,
          border: '1px solid var(--color-border-subtle)',
          minWidth: '160px',
          overflow: 'hidden',
          transition: 'bottom 0.3s ease'
        }}>
          <a href="/profile" style={{
            display: 'block',
            padding: 'var(--space-md)',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            borderBottom: '1px solid var(--color-border-subtle)'
          }}>
            Profile
          </a>
          <a href="/settings" style={{
            display: 'block',
            padding: 'var(--space-md)',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            borderBottom: '1px solid var(--color-border-subtle)'
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
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
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
        background: 'var(--color-surface-primary)',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 200,
        border: '1px solid var(--color-border-subtle)',
        transition: 'bottom 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: 'var(--space-sm)',
          gap: 'var(--space-sm)'
        }}>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              color: 'var(--color-text-inverse)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-gradient-primary)',
              boxShadow: 'var(--shadow-md)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Chat
          </button>

          {/* Quick Order - Matches header button style */}
          <a href={vendorSlug ? `/orders/new?b=${vendorSlug}` : "/orders/new"} style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 'var(--space-xs) var(--space-md)',
            background: 'var(--color-gradient-secondary)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
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
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-glass-light)',
              border: '1px solid var(--color-glass-border-light)',
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

      {/* Chat Sheet */}
      {organizationId && vendorSlug && (
        <ChatSheet
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          organizationId={organizationId}
          vendorSlug={vendorSlug}
          user={user}
        />
      )}
    </>
  );
}
