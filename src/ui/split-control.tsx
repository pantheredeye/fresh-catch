import type { FC } from "hono/jsx";

export type SplitControlItem = { href: string; label: string; ariaLabel: string };

/** Two 60px-tall halves — permitted per handoff §3's amendment for exactly-two-action rows (directions + phone). Do not extend to three-up. */
export const SplitControl: FC<{ items: readonly [SplitControlItem, SplitControlItem] }> = ({ items }) => (
  <div class="split">
    {items.map((item) => (
      <a href={item.href} aria-label={item.ariaLabel}>
        {item.label}
      </a>
    ))}
  </div>
);
