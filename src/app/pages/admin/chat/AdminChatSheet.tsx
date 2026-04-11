"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";

type SheetState = "closed" | "peek" | "full";

interface AdminChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

const PEEK_HEIGHT = 65;
const FULL_HEIGHT = 92;

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
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const transition = reducedMotion ? "none" : "transform 0.3s ease";
  const backdropTransition = reducedMotion ? "none" : "opacity 0.3s ease";

  // Sync isOpen to sheet state
  useEffect(() => {
    if (isOpen) {
      setSheetState("peek");
    } else {
      setSheetState("closed");
      setActiveConversationId(null);
      setActiveCustomerName("");
    }
  }, [isOpen]);

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
    setActiveCustomerName("");
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
    (conversationId: string, customerName?: string) => {
      setActiveConversationId(conversationId);
      if (customerName) setActiveCustomerName(customerName);
      setSheetState("full");
    },
    [],
  );

  // Drag gestures (shared logic)
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
        .admin-chat-sheet-panel button:focus-visible,
        .admin-chat-sheet-panel textarea:focus-visible,
        .admin-chat-sheet-panel a:focus-visible {
          outline: 2px solid var(--color-action-primary);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-chat-sheet-panel button { transition: none !important; }
        }
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
              padding: "0 var(--space-md) var(--space-sm)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
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
              {activeConversationId
                ? activeCustomerName || "Chat"
                : "Messages"}
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
        </div>

        {/* Content: ConversationList or ChatThread */}
        {!activeConversationId ? (
          <ConversationList
            organizationId={organizationId}
            onSelectConversation={handleSelectConversation}
          />
        ) : (
          <ChatThread
            conversationId={activeConversationId}
            active={sheetState !== "closed"}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </>
  );
}
