import type { FC } from "hono/jsx";

export type ActionBarItem = { href: string; label: string; ariaLabel?: string };

/** Sticky bottom bar of three 58px cells, phones only (<700px). Separate from SplitControl, which stays exactly two-up. */
export const ActionBar: FC<{ items: readonly [ActionBarItem, ActionBarItem, ActionBarItem] }> = ({ items }) => (
  <nav class="action-bar" aria-label="Quick actions">
    {items.map((item) => (
      <a href={item.href} aria-label={item.ariaLabel}>
        {item.label}
      </a>
    ))}
  </nav>
);
