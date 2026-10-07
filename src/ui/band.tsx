import type { FC, PropsWithChildren } from "hono/jsx";

type BandProps = PropsWithChildren<{
  tone: "sand" | "paper" | "shallow" | "sea" | "deep";
  class?: string;
  /** Swap the inner `.wrap` for the wider `.container` (home page's shared left edge). */
  container?: boolean;
}>;

/** Full-bleed surface with an inner `.wrap` — dark tones (sea/deep) are punctuation per §3, not the reading surface. */
export const Band: FC<BandProps> = ({ tone, class: extra, container, children }) => (
  <div class={[tone === "sand" ? "band" : `band band-${tone}`, extra].filter(Boolean).join(" ")}>
    <div class={container ? "container" : "wrap"}>{children}</div>
  </div>
);
