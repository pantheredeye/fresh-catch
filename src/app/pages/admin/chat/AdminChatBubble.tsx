'use client';

import { useEffect, useState, useCallback } from 'react';
import { NotificationBadge } from '@/design-system';
import { getUnreadCount } from '@/chat/functions';

export function AdminChatBubble({ organizationId }: {
  organizationId?: string | null;
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

  return (
    <button
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-gradient-primary)',
        color: 'var(--color-text-inverse)',
        border: 'none',
        boxShadow: 'var(--shadow-lg)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        zIndex: 300,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      aria-label={unreadCount > 0 ? `Chat — ${unreadCount} unread` : 'Chat'}
    >
      💬
      {unreadCount > 0 && (
        <NotificationBadge position="top-right" offset="-4px" variant="coral" size="sm">
          {unreadCount}
        </NotificationBadge>
      )}
    </button>
  );
}
