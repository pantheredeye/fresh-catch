"use client";

import { useEffect, useState } from "react";
import "./navigation-progress.css";

/**
 * NavigationProgress — interim feedback for full-page navigations.
 *
 * This app does full browser navigations (no client-side routing yet), and
 * Workers + D1 cold starts mean a tap can sit for 1-3 seconds with zero
 * visible response. This component watches for real same-origin link clicks
 * and form submissions and immediately shows an indeterminate progress bar
 * at the top of the viewport, so users know their tap registered.
 *
 * Remove once the client-navigation migration lands.
 */

// Safety net: if a navigation is aborted (stop button, offline, etc.) the
// document sticks around — clear the bar so it doesn't hang forever.
const RESET_AFTER_MS = 12000;

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/** True if following this anchor triggers a full page load in this tab. */
function causesPageLoad(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (!anchor.getAttribute("href")) return false;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  // Covers external links and non-http schemes (mailto:, tel: have an
  // opaque origin that never matches).
  if (url.origin !== window.location.origin) return false;

  // Hash-only jump within the current page: no page load happens.
  if (
    url.hash &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return false;
  }

  return true;
}

/** True if submitting this form triggers a full page load in this tab. */
function causesFormPageLoad(form: HTMLFormElement): boolean {
  if (form.target && form.target !== "_self") return false;

  // getAttribute avoids the classic footgun where an <input name="action">
  // shadows form.action.
  const action = form.getAttribute("action");
  if (action) {
    try {
      if (new URL(action, window.location.href).origin !== window.location.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function NavigationProgress() {
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      clearTimeout(resetTimer);
      setNavigating(true);
      resetTimer = setTimeout(() => setNavigating(false), RESET_AFTER_MS);
    };

    const stop = () => {
      clearTimeout(resetTimer);
      setNavigating(false);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || !causesPageLoad(anchor)) return;

      // We listen in the capture phase, which runs before the target's own
      // handlers — so defer the defaultPrevented check until the event has
      // fully dispatched.
      setTimeout(() => {
        if (!event.defaultPrevented) start();
      }, 0);
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!causesFormPageLoad(form)) return;

      setTimeout(() => {
        if (!event.defaultPrevented) start();
      }, 0);
    };

    // pageshow fires on bfcache restores (event.persisted) with the old DOM
    // still live — reset unconditionally so back-navigation never shows a
    // stuck bar. pagehide keeps the cached snapshot clean going the other way.
    const handlePageShow = () => stop();
    const handlePageHide = () => stop();

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearTimeout(resetTimer);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  if (!navigating) return null;

  return <div className="nav-progress" role="progressbar" aria-label="Loading page" />;
}
