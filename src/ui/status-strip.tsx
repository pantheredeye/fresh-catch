import type { FC } from "hono/jsx";

type StatusStripProps = {
  open: boolean;
  label: string;
  message: string;
};

/**
 * Open/closed status line (handoff §4) — teal/coral-dot when open vs
 * muted/square-dot when closed, so the state is never carried by color
 * alone. Used on the market detail page (one specific market).
 */
export const StatusStrip: FC<StatusStripProps> = ({ open, label, message }) => (
  <div class={open ? "strip" : "strip shut"}>
    <div class="wrap">
      <span class="dot" aria-hidden="true"></span>
      <b>{label}</b>
      <span>{message}</span>
    </div>
  </div>
);
