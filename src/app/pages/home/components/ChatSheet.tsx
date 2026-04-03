"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type SheetState = "closed" | "peek" | "full";

interface ChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  organizationId: string;
  vendorSlug: string;
}

const PEEK_HEIGHT = 65; // dvh
const FULL_HEIGHT = 92; // dvh

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

export function ChatSheet({
  isOpen,
  onClose,
  conversationId,
  organizationId,
  vendorSlug,
}: ChatSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("closed");
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const transition = reducedMotion ? "none" : "transform 0.3s ease";
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
        .chat-sheet-panel { height: 100vh; height: 100dvh; }
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
        {/* Drag handle - touch events ONLY on this element */}
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
            padding: `0 var(--space-md) var(--space-sm)`,
            borderBottom: "1px solid var(--color-border-subtle)",
            flexShrink: 0,
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

        {/* Content area - scrollable, does NOT capture drag events */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-md)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Chat messages will be rendered here by child components */}
        </div>
      </div>
    </>
  );
}
