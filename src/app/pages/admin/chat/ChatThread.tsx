"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { getConversation, markAsRead } from "@/chat/functions";

interface ChatMessage {
  id: string;
  content: string;
  senderType: "customer" | "vendor" | "ai";
  senderId: string | null;
  createdAt: string;
}

interface ChatThreadProps {
  conversationId: string;
  /** Whether WS should be active (false when sheet is closed/animating out) */
  active: boolean;
  reducedMotion: boolean;
}

const MAX_CHARS = 500;
const COUNTER_THRESHOLD = 400;
const SEND_COOLDOWN_MS = 2000;

export function ChatThread({
  conversationId,
  active,
  reducedMotion,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [sendCooldown, setSendCooldown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectDelayRef = useRef(1000);

  // Load initial conversation data and mark as read
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conv = await getConversation(conversationId);
        if (cancelled || !conv) return;
        setCustomerName(conv.customerName);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, reducedMotion]);

  // WebSocket connection for this conversation
  useEffect(() => {
    if (!active) return;

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

      ws.addEventListener("error", () => {
        ws.close();
      });
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, active]);

  const canSend = inputValue.trim().length > 0 && !sendCooldown;

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sendCooldown) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          content: text,
          senderType: "vendor",
        }),
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

  return (
    <>
      {/* Message area */}
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
              No messages yet
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isVendor = msg.senderType === "vendor";
            const isAi = msg.senderType === "ai";
            const isOurSide = isVendor || isAi;
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isOurSide ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "var(--space-sm) var(--space-md)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-lg)",
                    lineHeight: "var(--line-height-base)",
                    background: isVendor
                      ? "var(--color-action-primary)"
                      : isAi
                        ? "var(--color-surface-tertiary, var(--color-surface-secondary))"
                        : "var(--color-surface-secondary)",
                    color: isVendor
                      ? "var(--color-text-inverse)"
                      : "var(--color-text-primary)",
                    border: isAi
                      ? "1px solid var(--color-border-subtle)"
                      : "none",
                  }}
                >
                  {isAi && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        color: "var(--color-text-tertiary)",
                        marginBottom: "var(--space-xs)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      AI
                    </span>
                  )}
                  {isAi ? <div>{msg.content}</div> : msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
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
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInputValue(e.target.value);
              }
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
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          &#x2191;
        </button>
      </form>
    </>
  );
}
