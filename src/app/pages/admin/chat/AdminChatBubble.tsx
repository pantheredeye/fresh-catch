'use client';

import { NotificationBadge } from '@/design-system';
import { useInbox } from '@/inbox/useInbox';

export function AdminChatBubble({ onChatClick, onVoiceClick }: {
  organizationId?: string | null;
  onChatClick?: () => void;
  onVoiceClick?: () => void;
}) {
  const { unreadCount } = useInbox();

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
