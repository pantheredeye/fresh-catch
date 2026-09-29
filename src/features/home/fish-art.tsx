import type { FC } from "hono/jsx";

/**
 * Filled-silhouette fish drawings (handoff §5 / issue #73 item 5, Q8
 * resolved: keep them). `currentColor`, decorative + `aria-hidden` — they
 * carry no information the row's text doesn't. Only 4 species have art
 * today; Barrett is commissioning the rest of the species list (issue #73
 * comment), so unmatched names render nothing — this switch is meant to
 * stay easy to extend (or to no-op entirely if the call ever comes back
 * "drop").
 */
export const FishArt: FC<{ name: string }> = ({ name }) => {
  switch (name.trim().toLowerCase()) {
    case "bass":
      return (
        <svg class="draw" viewBox="-3 -3 126 76" fill="currentColor" aria-hidden="true">
          <path d="M6 38c4-8 12-14 22-18l4-11 6 9 6-11 6 10 6-11 5 11c11 2 21 7 29 14l22-15v38L90 40c-8 8-20 13-32 15-18 3-40-4-52-17Z" />
          <path d="M34 46 41 59 52 50c-7 0-13-2-18-4Z" />
          <circle cx="19" cy="33" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "catfish":
      return (
        <svg class="draw" viewBox="-3 -3 126 76" fill="currentColor" aria-hidden="true">
          <path d="M8 35c4-9 14-15 28-16 20-2 40 3 56 12l22-14v38L92 41c-16 9-36 14-56 12-14-1-24-8-28-18Z" />
          <path d="M40 21 49 6 60 20c-7-1-14-1-20 1Z" />
          <path d="M78 24 84 18 87 25c-3-1-6-1-9-1Z" />
          <path d="M32 45 38 58 50 49c-7 0-13-2-18-4Z" />
          <circle cx="20" cy="30" r="2.9" fill="var(--palette-sand)" />
          <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M11 29C5 23 4 15 7 8" />
            <path d="M11 40c-6 6-7 14-4 21" />
          </g>
        </svg>
      );
    case "flounder":
      return (
        <svg class="draw" viewBox="-3 -3 126 76" fill="currentColor" aria-hidden="true">
          <path d="M10 35C12 18 32 8 58 8c22 0 38 8 42 18l14-8v34l-14-8c-4 10-20 18-42 18-26 0-48-10-48-27Z" />
          <circle cx="28" cy="27" r="3" fill="var(--palette-sand)" />
          <circle cx="38" cy="19" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "shark":
      return (
        <svg class="draw" viewBox="-3 -3 126 76" fill="currentColor" aria-hidden="true">
          <path d="M2 40c8-10 22-17 40-19l8-17 12 16c14 1 26 5 34 12l22-26-14 24 8 16-16-8c-10 7-26 12-44 13-20 1-42-5-50-11Z" />
          <path d="M36 45l6 15 14-10c-7 0-14-2-20-5Z" />
          <path d="M78 27l7-7 3 9c-3-1-6-2-10-2Z" />
          <g fill="none" stroke="var(--palette-sand)" stroke-width="2.6" stroke-linecap="round">
            <path d="M26 29c-1 4-1 9 0 13M32 28c-1 4-1 10 0 14M38 28c-1 4-1 10 0 14" />
          </g>
          <circle cx="17" cy="35" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    default:
      return null;
  }
};
