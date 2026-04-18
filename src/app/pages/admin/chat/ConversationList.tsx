"use client";

import { useInbox } from "@/inbox/useInbox";

interface ConversationListProps {
  organizationId: string;
  onSelectConversation: (conversationId: string, customerName?: string) => void;
}

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "\u2026";
}

export function ConversationList({
  onSelectConversation,
}: ConversationListProps) {
  const { conversations } = useInbox();

  if (conversations.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "var(--space-xl)",
        }}
      >
        <p
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-lg)",
            margin: 0,
          }}
        >
          No conversations yet
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Conversations"
      style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {conversations.map((conv) => (
        <button
          key={conv.id}
          role="listitem"
          aria-label={`${conv.customerName}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ''}${conv.lastMessagePreview ? `: ${truncate(conv.lastMessagePreview, 40)}` : ''}`}
          onClick={() => onSelectConversation(conv.id, conv.customerName)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            width: "100%",
            padding: "var(--space-md)",
            border: "none",
            borderBottom: "1px solid var(--color-border-subtle)",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {/* Unread dot */}
          <div
            style={{
              width: 10,
              minWidth: 10,
              height: 10,
              borderRadius: "var(--radius-full)",
              background:
                conv.unreadCount > 0
                  ? "var(--color-action-secondary)"
                  : "transparent",
              flexShrink: 0,
            }}
          />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "var(--space-sm)",
              }}
            >
              <span
                style={{
                  fontWeight: conv.unreadCount > 0 ? 700 : 500,
                  fontSize: "var(--font-size-md)",
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {conv.customerName}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-tertiary)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
              </span>
            </div>
            {conv.lastMessagePreview && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {truncate(conv.lastMessagePreview, 60)}
              </p>
            )}
          </div>
        </button>
      ))}

      {/* See all messages link */}
      <div
        style={{
          padding: "var(--space-md)",
          textAlign: "center",
        }}
      >
        <a
          href="/admin/messages"
          style={{
            color: "var(--color-action-primary)",
            fontSize: "var(--font-size-sm)",
            textDecoration: "none",
          }}
        >
          See all messages
        </a>
      </div>
    </div>
  );
}
