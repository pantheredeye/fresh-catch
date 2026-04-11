'use client';

import { useEffect, useState, useCallback } from 'react';
import { Menu } from '@base-ui/react/menu';
import { ShareModal, NotificationBadge } from '@/design-system';
import { getCurrentOrgShareUrl } from '@/utils/share';
import { trackShare } from '../share-functions';
import { getUnreadCountForConversation, markAsRead } from '@/chat/functions';
import { getUpdatedOrderCount } from '@/app/pages/orders/functions';
import { getStoredConversationId, storeConversationId } from './NamePrompt';
import { ChatSheet } from './ChatSheet';
import { useVoiceCommand } from '@/contexts/VoiceCommandContext';
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
  const [orderUpdateCount, setOrderUpdateCount] = useState(0);
  const { openCommandBar } = useVoiceCommand();

  // Timeout wrapper — prevents server function hangs from blocking the UI.
  // rwsdk 1.0.8 corrupts RSC stream state on mid-render throws, so we must
  // never let a hung POST propagate; AbortController isn't available for
  // server functions, so we race against a timer.
  const withTimeout = useCallback(<T,>(fn: () => Promise<T>, ms = 8_000): Promise<T> => {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);
  }, []);

  // Poll unread count every 30s when chat is closed
  const fetchUnread = useCallback(async () => {
    if (!organizationId) return;
    const convId = getStoredConversationId(organizationId);
    if (!convId) return;
    try {
      const count = await withTimeout(() => getUnreadCountForConversation(convId, 'customer'));
      setUnreadCount(count);
    } catch {
      // Silently fail — badge just won't update
    }
  }, [organizationId, withTimeout]);

  // Poll order updates every 30s
  const fetchOrderUpdates = useCallback(async () => {
    try {
      const lastViewed = localStorage.getItem('fresh-catch-orders-last-viewed') || new Date(0).toISOString();
      const count = await withTimeout(() => getUpdatedOrderCount(lastViewed));
      setOrderUpdateCount(count);
    } catch {
      // Silently fail
    }
  }, [withTimeout]);

  // Stagger initial fetches to avoid concurrent D1/DO cold-start contention.
  // Poll every 30s after that.
  useEffect(() => {
    if (chatOpen || !organizationId) return;
    const delay = setTimeout(fetchUnread, 2_000); // 2s after mount
    const interval = setInterval(fetchUnread, 30_000);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, [chatOpen, organizationId, fetchUnread]);

  useEffect(() => {
    const delay = setTimeout(fetchOrderUpdates, 4_000); // 4s after mount
    const interval = setInterval(fetchOrderUpdates, 30_000);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, [fetchOrderUpdates]);

  // When chat opens, reset badge and mark messages as read (fire-and-forget)
  const handleChatToggle = useCallback(() => {
    const opening = !chatOpen;
    setChatOpen(opening);
    if (opening && organizationId) {
      setUnreadCount(0);
      const convId = getStoredConversationId(organizationId);
      if (convId) {
        markAsRead(convId, 'customer').catch(() => { /* stale or missing — ignore */ });
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

          {/* Mic - opens CommandBar via layout context */}
          <button
            onClick={openCommandBar}
            aria-label="Voice command"
            className="bottom-nav-mic"
            style={{
              padding: 'var(--space-sm)',
              color: 'var(--color-action-primary)',
              fontSize: 'var(--font-size-md)',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              border: '1.5px solid var(--color-border-light)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              transition: 'all 0.2s ease',
            }}
          >
            🎙️
          </button>

          <Menu.Root>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Menu.Trigger className="bottom-nav-menu-trigger">
                <span className="trigger-icon">⋯</span>
                <span className="close-icon">✕</span>
              </Menu.Trigger>
              {orderUpdateCount > 0 && (
                <NotificationBadge position="top-right" offset="-4px" variant="coral" size="sm">
                  {orderUpdateCount}
                </NotificationBadge>
              )}
            </div>
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
                    render={<a href="/orders" />}
                  >
                    <span className="menu-icon">📋</span> Orders
                    {orderUpdateCount > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        padding: '2px 8px',
                        background: 'var(--color-action-secondary)',
                        color: 'var(--color-text-inverse)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-bold)',
                      }}>
                        {orderUpdateCount}
                      </span>
                    )}
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
