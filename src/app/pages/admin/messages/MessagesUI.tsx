"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  type FormEvent,
} from "react";
import {
  getConversationsWithUnread,
  resolveConversation,
  markAsRead,
} from "@/chat/functions";

type StatusFilter = "open" | "resolved" | "all";

interface ConversationRow {
  id: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  lastMessagePreview: string | null;
  lastMessageSenderType: "customer" | "vendor" | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  content: string;
  senderType: "customer" | "vendor";
  senderId: string | null;
  createdAt: string;
}

interface MessagesUIProps {
  organizationId: string;
  initialConversations: ConversationRow[];
}

// --- Helpers ---

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
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "\u2026";
}

// --- Filter Tabs ---

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function FilterTabs({
  active,
  counts,
  onChange,
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (f: StatusFilter) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "var(--space-xs)",
        padding: "var(--space-sm) var(--space-md)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          style={{
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: "var(--radius-md)",
            border: "none",
            background:
              active === key
                ? "var(--color-action-primary)"
                : "var(--color-surface-secondary)",
            color:
              active === key
                ? "var(--color-text-inverse)"
                : "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {label} ({counts[key]})
        </button>
      ))}
    </div>
  );
}

// --- Conversation List ---

function ConversationListPanel({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-2xl)",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p style={{ fontSize: "var(--font-size-md)", margin: 0 }}>
          No conversations
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Conversations"
      style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
    >
      {conversations.map((conv) => (
        <button
          key={conv.id}
          role="listitem"
          aria-label={`${conv.customerName}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ""}`}
          onClick={() => onSelect(conv.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            width: "100%",
            padding: "var(--space-md)",
            border: "none",
            borderBottom: "1px solid var(--color-border-subtle)",
            background:
              selectedId === conv.id
                ? "var(--color-surface-secondary)"
                : "transparent",
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-xs)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color:
                      conv.status === "open"
                        ? "var(--color-status-success)"
                        : "var(--color-text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  {conv.status}
                </span>
                {conv.lastMessageAt && (
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                )}
              </div>
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
                {conv.lastMessageSenderType === "vendor" ? "You: " : ""}
                {truncate(conv.lastMessagePreview, 60)}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// --- Thread View ---

const MAX_CHARS = 500;
const COUNTER_THRESHOLD = 400;
const SEND_COOLDOWN_MS = 2000;

function ThreadView({
  conversationId,
  customerName,
  status,
  onBack,
  onResolved,
}: {
  conversationId: string;
  customerName: string;
  status: string;
  onBack: () => void;
  onResolved: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sendCooldown, setSendCooldown] = useState(false);
  const [resolving, startResolveTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectDelayRef = useRef(1000);

  // Load initial messages + mark as read
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getConversation } = await import("@/chat/functions");
        const conv = await getConversation(conversationId);
        if (cancelled || !conv) return;
        setMessages(
          conv.messages.map((m) => ({
            id: m.id,
            content: m.content,
            senderType: m.senderType as "customer" | "vendor",
            senderId: m.senderId,
            createdAt:
              typeof m.createdAt === "string"
                ? m.createdAt
                : new Date(m.createdAt).toISOString(),
          })),
        );
        await markAsRead(conversationId, "vendor");
      } catch {
        // silently fail
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket
  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/chat/${conversationId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        reconnectDelayRef.current = 1000;
      });

      ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "history") {
          setMessages(data.messages);
        } else if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
        }
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        if (stopped) return;
        const delay = reconnectDelayRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(delay * 2, 30000);
          connect();
        }, delay);
      });

      ws.addEventListener("error", () => ws.close());
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [conversationId]);

  const canSend = inputValue.trim().length > 0 && !sendCooldown;

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sendCooldown) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "message", content: text, senderType: "vendor" }),
      );
    }
    setInputValue("");
    setSendCooldown(true);
    setTimeout(() => setSendCooldown(false), SEND_COOLDOWN_MS);
  }, [inputValue, sendCooldown]);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  const handleResolve = () => {
    startResolveTransition(async () => {
      await resolveConversation(conversationId);
      onResolved();
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Thread header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-xl)",
            color: "var(--color-text-secondary)",
            padding: "var(--space-xs)",
            display: "flex",
            alignItems: "center",
          }}
        >
          &#x2190;
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-primary)",
            }}
          >
            {customerName}
          </span>
          <span
            style={{
              marginLeft: "var(--space-sm)",
              fontSize: "var(--font-size-xs)",
              color:
                status === "open"
                  ? "var(--color-status-success)"
                  : "var(--color-text-tertiary)",
              fontWeight: 500,
            }}
          >
            {status}
          </span>
        </div>
        {status === "open" && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            style={{
              padding: "var(--space-xs) var(--space-md)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-light)",
              background: "var(--color-surface-primary)",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              cursor: resolving ? "default" : "pointer",
              opacity: resolving ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {resolving ? "Resolving\u2026" : "Mark as resolved"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-md)",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        {messages.length === 0 ? (
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
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent:
                  msg.senderType === "vendor" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "var(--space-sm) var(--space-md)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-lg)",
                  lineHeight: "var(--line-height-base)",
                  background:
                    msg.senderType === "vendor"
                      ? "var(--color-action-primary)"
                      : "var(--color-surface-secondary)",
                  color:
                    msg.senderType === "vendor"
                      ? "var(--color-text-inverse)"
                      : "var(--color-text-primary)",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleFormSubmit}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          borderTop: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
          background: "var(--color-surface-primary)",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setInputValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a reply..."
            rows={1}
            aria-label="Message input"
            style={{
              width: "100%",
              height: 52,
              minHeight: 52,
              maxHeight: 52,
              fontSize: "var(--font-size-lg)",
              lineHeight: "var(--line-height-base)",
              padding: "var(--space-sm) var(--space-md)",
              border: "1px solid var(--color-border-input)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text-primary)",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          {inputValue.length > COUNTER_THRESHOLD && (
            <span
              aria-live="polite"
              style={{
                position: "absolute",
                right: 8,
                bottom: 4,
                fontSize: "var(--font-size-xs)",
                color:
                  inputValue.length >= MAX_CHARS
                    ? "var(--color-status-error)"
                    : "var(--color-text-tertiary)",
              }}
            >
              {inputValue.length}/{MAX_CHARS}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 48,
            height: 48,
            minWidth: 48,
            minHeight: 48,
            borderRadius: "var(--radius-full)",
            border: "none",
            background: canSend
              ? "var(--color-action-primary)"
              : "var(--color-surface-secondary)",
            color: canSend
              ? "var(--color-text-inverse)"
              : "var(--color-text-tertiary)",
            cursor: canSend ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "var(--font-size-xl)",
          }}
        >
          &#x2191;
        </button>
      </form>
    </div>
  );
}

// --- Main Component ---

export function MessagesUI({
  organizationId,
  initialConversations,
}: MessagesUIProps) {
  const [conversations, setConversations] =
    useState<ConversationRow[]>(initialConversations);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Poll for conversation updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getConversationsWithUnread(organizationId);
        setConversations(data as ConversationRow[]);
      } catch {
        // silently fail
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const filtered = conversations.filter((c) =>
    filter === "all" ? true : c.status === filter,
  );

  const counts: Record<StatusFilter, number> = {
    open: conversations.filter((c) => c.status === "open").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
    all: conversations.length,
  };

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleResolved = async () => {
    // Refresh conversation list after resolving
    try {
      const data = await getConversationsWithUnread(organizationId);
      setConversations(data as ConversationRow[]);
    } catch {
      // silently fail
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Messages
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            margin: "var(--space-xs) 0 0",
          }}
        >
          {counts.open} open, {counts.resolved} resolved
        </p>
      </div>

      {/* Main layout */}
      <div
        style={{
          display: "flex",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-primary)",
          height: "calc(100vh - 200px)",
          minHeight: 400,
          overflow: "hidden",
        }}
      >
        {/* List panel - hidden on mobile when thread is open */}
        <div
          style={{
            width: selectedId ? undefined : "100%",
            minWidth: selectedId ? 320 : undefined,
            maxWidth: selectedId ? 380 : undefined,
            display: "flex",
            flexDirection: "column",
            borderRight: selectedId
              ? "1px solid var(--color-border-subtle)"
              : undefined,
          }}
          className={selectedId ? "messages-list-panel--hidden-mobile" : ""}
        >
          <FilterTabs active={filter} counts={counts} onChange={setFilter} />
          <ConversationListPanel
            conversations={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Thread panel */}
        {selectedId && selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <ThreadView
              key={selectedId}
              conversationId={selectedId}
              customerName={selected.customerName}
              status={selected.status}
              onBack={() => setSelectedId(null)}
              onResolved={handleResolved}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-tertiary)",
            }}
            className="messages-empty-thread"
          >
            <p style={{ fontSize: "var(--font-size-md)", margin: 0 }}>
              Select a conversation
            </p>
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 768px) {
              .messages-list-panel--hidden-mobile {
                display: none !important;
              }
              .messages-empty-thread {
                display: none !important;
              }
            }
            @media (min-width: 769px) {
              .messages-list-panel--hidden-mobile {
                display: flex !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
