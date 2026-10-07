import type { FC } from "hono/jsx";

/**
 * Open/closed status line (handoff §4) — teal/coral-dot when open vs
 * muted/square-dot when closed, so the state is never carried by color
 * alone. Shared between the landing hero (today's featured market) and the
 * market detail page (one specific market).
 */
export const StatusStrip: FC<{ open: boolean; label: string; message: string; container?: boolean }> = ({
  open,
  label,
  message,
  container,
}) => (
  <div class={open ? "strip" : "strip shut"}>
    <div class={container ? "container" : "wrap"}>
      <span class="dot" aria-hidden="true"></span>
      <b>{label}</b>
      <span>{message}</span>
    </div>
  </div>
);
