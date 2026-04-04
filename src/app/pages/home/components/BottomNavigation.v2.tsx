'use client';

import { useEffect, useState, useCallback } from 'react';
import { Menu } from '@base-ui/react/menu';
import { ShareModal, NotificationBadge } from '@/design-system';
import { getCurrentOrgShareUrl } from '@/utils/share';
import { trackShare } from '../share-functions';
import { getUnreadCountForConversation, markAsRead } from '@/chat/functions';
import { getStoredConversationId, storeConversationId } from './NamePrompt';
import { ChatSheet } from './ChatSheet';
import './BottomNavigation.css';

/**
 * BottomNavigation V2 - Bottom nav with Chat, Quick Order, More
 *
 * WHY: Chat replaces Home button; logo in Header handles home navigation.
 * Quick Order button styled prominently in center.
 */
export function BottomNavigationV2({ vendorSlug, vendorName, organizationId, user, chatConversationId }: {
  vendorSlug?: string;
  vendorName?: string;
  organizationId?: string;
  user?: { name: string; phone?: string } | null;
  chatConversationId?: string;
} = {}) {
  const [footerVisible, setFooterVisible] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count every 30s when chat is closed
  const fetchUnread = useCallback(async () => {
    if (!organizationId) return;
    const convId = getStoredConversationId(organizationId);
    if (!convId) return;
    try {
      const count = await getUnreadCountForConversation(convId, 'customer');
      setUnreadCount(count);
    } catch {
      // Silently fail — badge just won't update
    }
  }, [organizationId]);

  useEffect(() => {
    if (chatOpen || !organizationId) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [chatOpen, organizationId, fetchUnread]);

  // When chat opens, reset badge and mark messages as read
  const handleChatToggle = useCallback(async () => {
    const opening = !chatOpen;
    setChatOpen(opening);
    if (opening && organizationId) {
      setUnreadCount(0);
      const convId = getStoredConversationId(organizationId);
      if (convId) {
        try { await markAsRead(convId, 'customer'); } catch { /* noop */ }
      }
    }
  }, [chatOpen, organizationId]);

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

  // Auto-open chat when resuming from email link (?chat= param)
  useEffect(() => {
    if (chatConversationId && organizationId) {
      storeConversationId(organizationId, chatConversationId);
      setChatOpen(true);
    }
  }, [chatConversationId, organizationId]);

  return (
    <>
      <nav className="bottom-nav-v2" style={{
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
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              onClick={handleChatToggle}
              aria-expanded={chatOpen}
              aria-label={unreadCount > 0 ? `Chat — ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : 'Chat'}
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
            {unreadCount > 0 && (
              <NotificationBadge position="top-right" offset="-4px" variant="coral" size="sm">
                {unreadCount}
              </NotificationBadge>
            )}
          </div>

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

          <Menu.Root>
            <Menu.Trigger className="bottom-nav-menu-trigger">
              <span className="trigger-icon">⋯</span>
              <span className="close-icon">✕</span>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner className="bottom-nav-menu-positioner" side="top" sideOffset={8}>
                <Menu.Popup className="bottom-nav-menu-popup">
                  <Menu.Item
                    className="bottom-nav-menu-item"
                    render={<a href="/profile" />}
                  >
                    <span className="menu-icon">👤</span> Profile
                  </Menu.Item>
                  <Menu.Item
                    className="bottom-nav-menu-item"
                    render={<a href="/settings" />}
                  >
                    <span className="menu-icon">⚙️</span> Settings
                  </Menu.Item>
                  <Menu.Separator className="bottom-nav-menu-separator" />
                  <Menu.Item
                    className="bottom-nav-menu-item"
                    onClick={() => setShareModalOpen(true)}
                  >
                    <span className="menu-icon">🔗</span> Share
                  </Menu.Item>
                  <Menu.Separator className="bottom-nav-menu-separator" />
                  <Menu.Item
                    className="bottom-nav-menu-item logout-item"
                    render={<a href="/logout" />}
                  >
                    <span className="menu-icon">🚪</span> Logout
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
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
          vendorName={vendorName}
          user={user}
        />
      )}
    </>
  );
}
