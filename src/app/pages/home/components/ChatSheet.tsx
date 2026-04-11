"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { NamePrompt, getStoredConversationId, clearStoredConversationId } from "./NamePrompt";
import { conversationExists, saveCustomerEmail } from "@/chat/functions";
import { ChatQuickActions } from "./ChatQuickActions";

type SheetState = "closed" | "peek" | "full";

interface ChatMessage {
  id: string;
  content: string;
  senderType: "customer" | "vendor" | "ai";
  senderId: string | null;
  createdAt: string;
}

interface ChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  vendorSlug: string;
  vendorName?: string;
  /** If provided, skip name prompt and auto-create conversation */
  user?: { name: string; phone?: string } | null;
}

const PEEK_HEIGHT = 65; // dvh
const FULL_HEIGHT = 92; // dvh
const MAX_CHARS = 500;
const COUNTER_THRESHOLD = 400;
const SEND_COOLDOWN_MS = 2000;

function getTranslateY(state: SheetState): string {
  return state === "closed" ? "translateY(100%)" : "translateY(0)";
}

function getSheetHeight(state: SheetState): string {
  switch (state) {
    case "closed":
      return `${PEEK_HEIGHT}dvh`;
    case "peek":
      return `${PEEK_HEIGHT}dvh`;
    case "full":
      return `${FULL_HEIGHT}dvh`;
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

export function ChatSheet({
  isOpen,
  onClose,
  organizationId,
  vendorSlug,
  vendorName,
  user,
}: ChatSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("closed");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [emailCollected, setEmailCollected] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [vendorOnline, setVendorOnline] = useState<boolean | null>(null);

  // Restore conversationId from localStorage on mount, validate it still exists
  useEffect(() => {
    const stored = getStoredConversationId(organizationId);
    if (!stored) return;
    let cancelled = false;
    conversationExists(stored).then((exists) => {
      if (cancelled) return;
      if (exists) {
        setConversationId(stored);
      } else {
        clearStoredConversationId(organizationId);
      }
    }).catch(() => {
      // Network error — still try to use it, WebSocket will handle if stale
      if (!cancelled) setConversationId(stored);
    });
    return () => { cancelled = true; };
  }, [organizationId]);

  const [inputValue, setInputValue] = useState("");
  const [sendCooldown, setSendCooldown] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reducedMotion = useReducedMotion();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, reducedMotion]);

  // WebSocket connection
  const isClosed = sheetState === "closed";
  useEffect(() => {
    if (!conversationId || isClosed) {
      return;
    }

    let stopped = false;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/chat/${conversationId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        reconnectDelayRef.current = 1000; // reset backoff on success
      });

      ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "history") {
          setMessages(data.messages);
          if (typeof data.vendorOnline === "boolean") {
            setVendorOnline(data.vendorOnline);
          }
        } else if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
        } else if (data.type === "vendor-presence") {
          setVendorOnline(data.vendorOnline);
        }
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        if (stopped) return;
        // Reconnect with exponential backoff
        const delay = reconnectDelayRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(delay * 2, 30000);
          connect();
        }, delay);
      });

      ws.addEventListener("error", () => {
        // If WS fails immediately (e.g. stale conversation), clear stored ID
        if (ws.readyState !== WebSocket.OPEN) {
          clearStoredConversationId(organizationId);
          setConversationId(null);
          setMessages([]);
        }
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
  }, [conversationId, isClosed]);

  const transition = reducedMotion ? "none" : "transform 0.3s ease, height 0.3s ease";
  const backdropTransition = reducedMotion ? "none" : "opacity 0.3s ease";

  // Sync isOpen prop to sheet state
  useEffect(() => {
    setSheetState(isOpen ? "peek" : "closed");
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sheetState !== "closed") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sheetState, onClose]);

  // Focus trap in full-screen state
  useEffect(() => {
    if (sheetState !== "full" || !sheetRef.current) return;
    const sheet = sheetRef.current;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [sheetState]);

  // Lock body scroll when sheet is open
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

  // Keyboard detection via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || sheetState === "closed") return;

    const initialHeight = vv.height;
    const handleResize = () => {
      const isKb = vv.height < initialHeight * 0.75;
      setKeyboardOpen(isKb);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, [sheetState]);

  // Auto-expand to full when keyboard opens, return to peek when closes
  useEffect(() => {
    if (sheetState === "closed") return;
    if (keyboardOpen) {
      setSheetState("full");
    } else {
      setSheetState("peek");
    }
  }, [keyboardOpen]); // intentionally not depending on sheetState to avoid loops

  const handleQuickAction = useCallback(
    (tool: string, args: Record<string, unknown>, optimisticText: string) => {
      // Insert optimistic customer message
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        content: optimisticText,
        senderType: "customer",
        senderId: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      // Send ai-action via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ai-action", tool, args }));
      }
    },
    [],
  );

  const canSend = inputValue.trim().length > 0 && !sendCooldown;

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sendCooldown) return;

    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text, senderType: "customer" }));
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

  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragCurrentY.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    dragCurrentY.current = clientY;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragStartY.current === null || dragCurrentY.current === null) return;

    const delta = dragCurrentY.current - dragStartY.current;
    const threshold = 50;

    if (delta < -threshold) {
      // Swiped up
      if (sheetState === "peek") setSheetState("full");
    } else if (delta > threshold) {
      // Swiped down
      if (sheetState === "full") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        onClose();
      }
    }

    dragStartY.current = null;
    dragCurrentY.current = null;
  }, [sheetState, onClose]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse events (desktop drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      handleDragMove(ev.clientY);
    };
    const onMouseUp = () => {
      handleDragEnd();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Unmount after close transition completes
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleTransitionEnd = useCallback(() => {
    if (sheetState === "closed") setShouldRender(false);
  }, [sheetState]);

  // For reduced motion, unmount immediately when closed
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

      {/* vh fallback for browsers without dvh support */}
      <style>{`
        .chat-sheet-panel { }
        .chat-sheet-panel button:focus-visible,
        .chat-sheet-panel textarea:focus-visible,
        .chat-sheet-panel a:focus-visible {
          outline: 2px solid var(--color-action-primary);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .chat-sheet-panel button { transition: none !important; }
        }
      `}</style>

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="chat-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Chat"
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: getSheetHeight(sheetState),
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
        {/* Drag zone: handle + header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            cursor: "grab",
            touchAction: "none",
            flexShrink: 0,
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {/* Drag pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "var(--space-sm) 0",
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
              padding: `0 var(--space-md) var(--space-sm)`,
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
          <h2
            style={{
              margin: 0,
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            Chat
          </h2>
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
        </div>

        {/* Vendor presence status bar + inline email collection */}
        {conversationId && vendorOnline !== null && (
          <div
            style={{
              padding: "var(--space-xs) var(--space-md)",
              background: "var(--color-surface-secondary)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-tertiary)",
              flexShrink: 0,
            }}
          >
            {vendorOnline ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-status-success)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                Online
              </div>
            ) : emailCollected ? (
              <div style={{ padding: "var(--space-xs) 0" }}>
                We&apos;ll email you when {vendorName ?? "they"} reply
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", padding: "var(--space-xs) 0" }}>
                <span>{vendorName ?? "Vendor"} is away. Get notified when they reply?</span>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmed = emailInput.trim();
                    if (!trimmed) return;
                    setEmailSaving(true);
                    setEmailError(null);
                    const result = await saveCustomerEmail(conversationId, trimmed);
                    setEmailSaving(false);
                    if (result.success) {
                      setEmailCollected(true);
                    } else {
                      setEmailError(result.error ?? "Something went wrong");
                    }
                  }}
                  style={{ display: "flex", gap: "var(--space-xs)", alignItems: "center" }}
                >
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(null); }}
                    disabled={emailSaving}
                    style={{
                      flex: 1,
                      fontSize: "var(--font-size-sm)",
                      padding: "var(--space-xs) var(--space-sm)",
                      border: emailError ? "1px solid var(--color-status-error)" : "1px solid var(--color-border-input)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    aria-label="Email address for notifications"
                  />
                  <button
                    type="submit"
                    disabled={emailSaving || !emailInput.trim()}
                    style={{
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: emailSaving ? "var(--color-surface-secondary)" : "var(--color-action-primary)",
                      color: "var(--color-text-inverse)",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      cursor: emailSaving ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {emailSaving ? "Saving..." : "Notify me"}
                  </button>
                </form>
                {emailError && (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-status-error)" }}>
                    {emailError}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content: name prompt or message thread */}
        {!conversationId ? (
          <NamePrompt
            organizationId={organizationId}
            onConversationCreated={setConversationId}
            autoCreateUser={user}
          />
        ) : (
          <>
            {/* Message area - scrollable */}
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
                      lineHeight: "var(--line-height-base)",
                      margin: 0,
                    }}
                  >
                    {vendorOnline === false
                      ? `Message ${vendorName ?? "us"} — they'll see it when they're back online.`
                      : `Say hi to ${vendorName ?? "us"}! We usually respond within a few hours.`}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.senderType === "customer";
                  const isAi = msg.senderType === "ai";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isCustomer ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "var(--space-sm) var(--space-md)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "var(--font-size-lg)",
                          lineHeight: "var(--line-height-base)",
                          background: isCustomer
                            ? "var(--color-action-primary)"
                            : isAi
                              ? "var(--color-surface-tertiary, var(--color-surface-secondary))"
                              : "var(--color-surface-secondary)",
                          color: isCustomer
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

            {/* Quick action chips */}
            <ChatQuickActions onAction={handleQuickAction} />

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
                  name="message"
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
                  placeholder="Type a message..."
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
