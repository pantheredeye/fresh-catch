"use client";

import { useEffect, useState, useCallback } from "react";
import { getConversationsWithUnread } from "@/chat/functions";

interface ConversationRow {
  id: string;
  customerName: string;
  customerPhone: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderType: "customer" | "vendor" | null;
  unreadCount: number;
  status: string;
  updatedAt: Date;
}

interface ConversationListProps {
  organizationId: string;
  onSelectConversation: (conversationId: string) => void;
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
  organizationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversationsWithUnread(organizationId);
      setConversations(data as ConversationRow[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-tertiary)",
          fontSize: "var(--font-size-md)",
        }}
      >
        Loading conversations...
      </div>
    );
  }

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
      style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv.id)}
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
                {timeAgo(conv.updatedAt)}
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
