import type { FC } from "hono/jsx";

type StatusStripProps = {
  open: boolean;
  label: string;
  message: string;
  container?: boolean;
  href?: string;
  /** False for the landing's schedule-only fallback, where there's no open/closed state to show. */
  dot?: boolean;
};

/**
 * Open/closed status line (handoff §4) — teal/coral-dot when open vs
 * muted/square-dot when closed, so the state is never carried by color
 * alone. Shared between the landing (next stop; `href` makes the whole strip a
 * 58px link to that market) and the market detail page (one specific market).
 */
export const StatusStrip: FC<StatusStripProps> = ({ open, label, message, container, href, dot = true }) => {
  const inner = (
    <div class={container ? "container" : "wrap"}>
      {dot ? <span class="dot" aria-hidden="true"></span> : null}
      <b>{label}</b>
      <span>{message}</span>
      {href ? <span class="strip-arrow" aria-hidden="true">→</span> : null}
    </div>
  );
  const cls = [open ? "strip" : "strip shut", href ? "strip-link" : ""].filter(Boolean).join(" ");
  return href ? (
    <a class={cls} href={href}>
      {inner}
    </a>
  ) : (
    <div class={cls}>{inner}</div>
  );
};
