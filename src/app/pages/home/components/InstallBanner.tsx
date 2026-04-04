"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "fresh-catch-install-banner-dismissed";

/**
 * InstallBanner - PWA install prompt.
 *
 * Chrome/Android/Edge: captures beforeinstallprompt, shows "Install" button.
 * iOS Safari: detects standalone capability, shows "Add to Home Screen" instructions.
 * Delayed until user scrolls or interacts. Dismissable with localStorage persistence.
 * Hidden when already running as installed PWA.
 */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<any>(null);
  const hasInteracted = useRef(false);

  useEffect(() => {
    try {
      // Already dismissed
      if (localStorage.getItem(STORAGE_KEY) === "true") return;
    } catch {
      return;
    }

    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(ios);

    // Track beforeinstallprompt (Chrome/Android/Edge)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      showAfterInteraction();
    };

    // Show banner after scroll or touch (not immediately)
    const showAfterInteraction = () => {
      if (hasInteracted.current) {
        setShow(true);
        return;
      }
    };

    const onInteraction = () => {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      // If we already have a prompt (or iOS), show now
      if (deferredPrompt.current || ios) {
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("scroll", onInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", onInteraction, { once: true, passive: true });
    window.addEventListener("click", onInteraction, { once: true });

    // On iOS, there's no beforeinstallprompt — show after interaction if iOS Safari
    if (ios) {
      // Will show once onInteraction fires
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("scroll", onInteraction);
      window.removeEventListener("touchstart", onInteraction);
      window.removeEventListener("click", onInteraction);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setShow(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const result = await deferredPrompt.current.userChoice;
      if (result.outcome === "accepted") {
        dismiss();
      }
      deferredPrompt.current = null;
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "0 var(--space-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          background: "var(--color-surface-secondary)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xl)", flexShrink: 0 }}>
          📲
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Install Fresh Catch
          </div>

          {isIOS ? (
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                lineHeight: "var(--line-height-base)",
              }}
            >
              Tap{" "}
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
                Share
              </span>{" "}
              then{" "}
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
                Add to Home Screen
              </span>{" "}
              for the best experience.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-base)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                Add to your home screen for quick access.
              </div>
              <button
                onClick={handleInstall}
                style={{
                  display: "inline-block",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-action-primary)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Install →
              </button>
            </>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss install banner"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "var(--space-xs)",
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-tertiary)",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
