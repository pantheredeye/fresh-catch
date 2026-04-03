"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { ConversationList } from "./ConversationList";
import { getConversation, markAsRead } from "@/chat/functions";

type SheetState = "closed" | "peek" | "full";

interface ChatMessage {
  id: string;
  content: string;
  senderType: "customer" | "vendor";
  senderId: string | null;
  createdAt: string;
}

interface AdminChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

const PEEK_HEIGHT = 65;
const FULL_HEIGHT = 92;
const MAX_CHARS = 500;
const COUNTER_THRESHOLD = 400;
const SEND_COOLDOWN_MS = 2000;

function getTranslateY(state: SheetState): string {
  switch (state) {
    case "closed":
      return "translateY(100%)";
    case "peek":
      return `translateY(${100 - PEEK_HEIGHT}%)`;
    case "full":
      return `translateY(${100 - FULL_HEIGHT}%)`;
  }
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function AdminChatSheet({
  isOpen,
  onClose,
  organizationId,
}: AdminChatSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("closed");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeCustomerName, setActiveCustomerName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sendCooldown, setSendCooldown] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectDelayRef = useRef(1000);
  const reducedMotion = useReducedMotion();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, reducedMotion]);

  // WebSocket connection for active thread
  const isClosed = sheetState === "closed";
  useEffect(() => {
    if (!activeConversationId || isClosed) return;

    let stopped = false;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/chat/${activeConversationId}`;
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
  }, [activeConversationId, isClosed]);

  const transition = reducedMotion ? "none" : "transform 0.3s ease";
  const backdropTransition = reducedMotion ? "none" : "opacity 0.3s ease";

  // Sync isOpen to sheet state
  useEffect(() => {
    if (isOpen) {
      setSheetState("peek");
    } else {
      setSheetState("closed");
      // Reset to list view when closing
      setActiveConversationId(null);
      setActiveCustomerName("");
      setMessages([]);
      setInputValue("");
    }
  }, [isOpen]);

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
    setActiveCustomerName("");
    setMessages([]);
    setInputValue("");
    setSheetState("peek");
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sheetState !== "closed") {
        if (activeConversationId) {
          handleBack();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sheetState, onClose, activeConversationId, handleBack]);

  // Lock body scroll when open
  useEffect(() => {
    if (sheetState !== "closed") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetState]);

  // Keyboard detection
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || sheetState === "closed") return;

    const initialHeight = vv.height;
    const handleResize = () => {
      setKeyboardOpen(vv.height < initialHeight * 0.75);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, [sheetState]);

  // Auto-expand on keyboard
  useEffect(() => {
    if (sheetState === "closed") return;
    if (keyboardOpen) {
      setSheetState("full");
    } else {
      setSheetState("peek");
    }
  }, [keyboardOpen]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      setSheetState("full");
      try {
        const conv = await getConversation(conversationId);
        if (conv) {
          setActiveCustomerName(conv.customerName);
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
          // Mark customer messages as read
          await markAsRead(conversationId, "vendor");
        }
      } catch {
        // silently fail
      }
    },
    [],
  );

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

  // Touch drag gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    dragCurrentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null || dragCurrentY.current === null) return;

    const delta = dragCurrentY.current - dragStartY.current;
    const threshold = 50;

    if (delta < -threshold) {
      if (sheetState === "peek") setSheetState("full");
    } else if (delta > threshold) {
      if (sheetState === "full") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        onClose();
      }
    }

    dragStartY.current = null;
    dragCurrentY.current = null;
  }, [sheetState, onClose]);

  // Unmount after close transition
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleTransitionEnd = useCallback(() => {
    if (sheetState === "closed") setShouldRender(false);
  }, [sheetState]);

  useEffect(() => {
    if (reducedMotion && sheetState === "closed") {
      setShouldRender(false);
    }
  }, [reducedMotion, sheetState]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--color-surface-overlay)",
          zIndex: 300,
          opacity: sheetState === "closed" ? 0 : 1,
          transition: backdropTransition,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      <style>{`
        .admin-chat-sheet-panel { height: 100vh; height: 100dvh; }
      `}</style>

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="admin-chat-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Admin Chat"
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          transform: getTranslateY(sheetState),
          transition,
          background: "var(--color-surface-primary)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          boxShadow: "var(--shadow-lg)",
          zIndex: 301,
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "var(--space-sm) 0",
            cursor: "grab",
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: "var(--radius-full)",
              background: "var(--color-border-subtle)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 var(--space-md) var(--space-sm)",
            borderBottom: "1px solid var(--color-border-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            {activeConversationId && (
              <button
                onClick={handleBack}
                aria-label="Back to conversations"
                style={{
                  background: "none",
                  border: "none",
                  padding: "var(--space-xs)",
                  cursor: "pointer",
                  color: "var(--color-action-primary)",
                  fontSize: "var(--font-size-lg)",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                &#x2190;
              </button>
            )}
            <h2
              style={{
                margin: 0,
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {activeConversationId ? activeCustomerName || "Chat" : "Messages"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            style={{
              background: "none",
              border: "none",
              padding: "var(--space-xs)",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-xl)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Content: ConversationList or Thread */}
        {!activeConversationId ? (
          <ConversationList
            organizationId={organizationId}
            onSelectConversation={handleSelectConversation}
          />
        ) : (
          <>
            {/* Message area */}
            <div
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
        )}
      </div>
    </>
  );
}
