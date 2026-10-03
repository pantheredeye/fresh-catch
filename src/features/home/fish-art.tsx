import type { FC } from "hono/jsx";

/**
 * Filled-silhouette fish drawings. All share one viewBox (rendered 72×40),
 * face left, one detail level (silhouette + eye + one feature).
 * `currentColor`, decorative + `aria-hidden`. Unmatched names get a generic
 * fish so every row has an icon.
 */
const KINDS: Array<[string, RegExp]> = [
  ["crawfish", /\b(crawfish|crayfish|crawdad)s?\b/],
  ["catfish", /\bcatfish(es)?\b/],
  ["flounder", /\b(flounder|fluke)s?\b/],
  ["shark", /\bsharks?\b/],
  ["bass", /\bbass(es)?\b/],
];

/** Alias-tolerant species match ("Sea Bass", "Flounders" → art key); `"fish"` when unknown. */
export function fishKind(name: string): string {
  const n = name.trim().toLowerCase();
  return KINDS.find(([, re]) => re.test(n))?.[0] ?? "fish";
}

export const FishArt: FC<{ name: string }> = ({ name }) => {
  switch (fishKind(name)) {
    case "bass":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 38c4-8 12-14 22-18l4-11 6 9 6-11 6 10 6-11 5 11c11 2 21 7 29 14l22-15v38L90 40c-8 8-20 13-32 15-18 3-40-4-52-17Z" />
          <path d="M34 46 41 59 52 50c-7 0-13-2-18-4Z" />
          <circle cx="19" cy="33" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "catfish":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
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
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 34C8 20 30 14 60 14s50 6 54 20c-4 14-24 20-54 20S8 48 4 34Z" />
          <path d="M16 20 22 11 30 17 38 9 46 16 54 8 62 15 70 8 78 16 86 10 92 18 100 14 104 22c-26-8-60-8-88-2ZM16 48l6 8 8-5 8 7 8-6 8 7 8-6 8 6 8-5 6 5 6-6 4-4c-24 6-60 6-88 0Z" />
          <circle cx="18" cy="28" r="3" fill="var(--palette-sand)" />
          <circle cx="27" cy="25" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "crawfish":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M26 33c0-5 4-9 10-9h14c4 0 7 3 7 9s-3 9-7 9H36c-6 0-10-4-10-9Z" />
          <path d="M58 26h12v16H58ZM72 28h12v12H72ZM86 29h10v10H86ZM98 30l16-9v25l-16-9Z" />
          <path d="M24 28C14 26 6 18 8 6c8 0 16 4 20 12ZM24 38c-10 2-18 10-16 22 8 0 16-4 20-12Z" />
          <path d="M36 24 30 14M44 24 40 12M36 42l-6 10M44 42l-4 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <circle cx="32" cy="29" r="2.4" fill="var(--palette-sand)" />
        </svg>
      );
    case "shark":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
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
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 34c8-12 22-18 38-18 16 0 30 6 40 18l30-14v28L84 34c-10 12-24 18-40 18-16 0-30-6-38-18Z" />
          <circle cx="22" cy="30" r="3" fill="var(--palette-sand)" />
        </svg>
      );
  }
};
