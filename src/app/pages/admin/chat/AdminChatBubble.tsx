'use client';

import { useEffect, useState, useCallback } from 'react';
import { NotificationBadge } from '@/design-system';
import { getUnreadCount } from '@/chat/functions';

export function AdminChatBubble({ organizationId, onChatClick, onVoiceClick }: {
  organizationId?: string | null;
  onChatClick?: () => void;
  onVoiceClick?: () => void;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!organizationId) return;
    try {
      const count = await getUnreadCount(organizationId, 'vendor');
      setUnreadCount(count);
    } catch {
      // Silently fail — badge just won't update
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [organizationId, fetchUnread]);

  const sharedStyle = {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    boxShadow: 'var(--shadow-lg)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  } as const;

  return (
    <>
    <style>{`
      .admin-action-bubble:focus-visible {
        outline: 2px solid var(--color-action-primary);
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        .admin-action-bubble { transition: none !important; }
      }
    `}</style>
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 300,
    }}>
      {/* Voice button (top) */}
      <button
        className="admin-action-bubble"
        onClick={onVoiceClick}
        style={{
          ...sharedStyle,
          background: 'var(--color-action-primary)',
          color: 'var(--color-text-inverse)',
        }}
        aria-label="Voice command"
      >
        🎙️
      </button>

      {/* Chat button (bottom) */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          className="admin-action-bubble"
          onClick={onChatClick}
          style={{
            ...sharedStyle,
            background: 'var(--color-gradient-primary)',
            color: 'var(--color-text-inverse)',
          }}
          aria-label={unreadCount > 0 ? `Chat — ${unreadCount} unread` : 'Chat'}
        >
          💬
        </button>
        {unreadCount > 0 && (
          <NotificationBadge position="top-right" offset="-4px" variant="coral" size="sm">
            {unreadCount}
          </NotificationBadge>
        )}
      </div>
    </div>
    </>
  );
}
