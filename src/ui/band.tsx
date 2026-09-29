import type { FC, PropsWithChildren } from "hono/jsx";

type BandProps = PropsWithChildren<{ tone: "sand" | "paper" | "shallow" | "sea" | "deep" }>;

/** Full-bleed surface with an inner `.wrap` — dark tones (sea/deep) are punctuation per §3, not the reading surface. */
export const Band: FC<BandProps> = ({ tone, children }) => (
  <div class={tone === "sand" ? "band" : `band band-${tone}`}>
    <div class="wrap">{children}</div>
  </div>
);
