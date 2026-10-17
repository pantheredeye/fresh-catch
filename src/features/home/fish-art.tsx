import type { FC } from "hono/jsx";

/**
 * Filled-silhouette fish drawings. All share one viewBox (rendered 46×26, 72×40 ≥700px),
 * face left, one detail level (silhouette + eye + one feature).
 * `currentColor`, decorative + `aria-hidden`. Unmatched names get a generic
 * fish so every row has an icon.
 */
const KINDS: Array<[string, RegExp]> = [
  ["shrimp", /\b(shrimps?|prawns?|royal reds?)\b/],
  ["crawfish", /\b(crawfish|crayfish|crawdad)s?\b/],
  ["catfish", /\bcatfish(es)?\b/],
  ["flounder", /\b(flounder|fluke)s?\b/],
  ["shark", /\bsharks?\b/],
  ["bass", /\bbass(es)?\b/],
  ["pompano", /\bpompanos?\b/],
  ["vermilion", /\b(vermilions?|beeliners?)\b/],
  ["snapper", /\bsnappers?\b/],
  ["crab", /\bcrabs?\b/],
  ["oyster", /\boysters?\b/],
  ["redfish", /\b(red ?fish(es)?|red drums?)\b/],
  ["trout", /\b(speckled trout|spotted sea ?trout|specks?|(sea ?)?trout)\b/],
  ["drum", /\b(black )?drums?\b/],
  ["sheepshead", /\bsheepsheads?\b/],
  ["grouper", /\bgroupers?\b/],
  ["mahi", /\b(mahi(-| )?mahi|mahi|dorados?|dolphin ?fish(es)?)\b/],
  ["tuna", /\b(tunas?|yellowfin|ahi)\b/],
  ["triggerfish", /\btrigger ?fish(es)?\b/],
  ["tripletail", /\btriple ?tails?\b/],
  ["cobia", /\b(cobias?|ling|lemon ?fish)\b/],
  ["amberjack", /\bamber ?jacks?\b/],
  ["mackerel", /\b(spanish |king )?mackerels?\b/],
  ["mullet", /\bmullets?\b/],
  ["swordfish", /\bsword ?fish(es)?\b/],
  ["buffalo", /\bbuffalo( ?fish(es)?)?\b/],
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
    case "shrimp":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 32 20 26c18-12 52-16 76-6 16 8 18 26 6 34l-9-8c6-5 4-14-6-16-16-4-34 2-48 10-8 4-16 4-21 0Z" />
          <path d="M98 49 78 60l10 6 8-6 6 7 4-14Z" />
          <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
            <path d="M20 27C14 13 30 4 64 4M22 26C14 18 18 8 34 1M38 41l-3 11M48 37l-2 12M58 34l-1 11" />
          </g>
          <path d="M62 17c2 6 1 12-2 17M78 16c3 6 3 13 0 18M92 21c4 5 5 11 2 16" fill="none" stroke="var(--palette-sand)" stroke-width="2.6" stroke-linecap="round" />
          <circle cx="24" cy="30" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "pompano":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M8 36c0-12 8-20 20-24l28-5 34 24 26-27-12 29 12 29-26-27-34 24-28-4C16 52 8 46 8 36Z" />
          <path d="M56 8C66 4 78 1 92 0 84 7 78 14 74 20ZM56 60c10 3 22 6 36 7-8-6-14-12-18-18Z" />
          <circle cx="22" cy="30" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "snapper":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 42 36 13c22-3 40 3 54 15l26-14-8 21 8 20-26-12c-14 10-32 15-50 14C24 56 10 52 2 42Z" />
          <path d="M36 14l3-8 4 7 3-8 4 7 3-7 4 7 3-7 4 7 3-6 3 8c9 0 17 5 22 12-14-6-38-10-56-12Z" />
          <path d="M38 46l4 13 12-9c-6 0-11-2-16-4Z" />
          <circle cx="28" cy="27" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "crab":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M30 34 10 28l20-6c10-8 50-8 60 0l20 6-20 6c-4 12-16 18-30 18S34 46 30 34Z" />
          <path d="M12 16c-2-8 4-14 14-14l-6 7 10 1c-2 8-12 12-18 6ZM108 16c2-8-4-14-14-14l6 7-10 1c2 8 12 12 18 6Z" />
          <g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M40 24 30 22 20 16M80 24l10-2 10-6M36 42l-14 6-4 10M44 48l-10 8-2 8M84 42l14 6 4 10M76 48l10 8 2 8" />
          </g>
          <circle cx="52" cy="24" r="2.6" fill="var(--palette-sand)" />
          <circle cx="68" cy="24" r="2.6" fill="var(--palette-sand)" />
        </svg>
      );
    case "oyster":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M30 62C14 52 18 30 34 18c2-6 8-8 12-6 3-5 9-6 13-3 4-4 10-4 13 0 5-3 11-2 13 3 5-1 10 2 10 7 5 2 7 8 4 12 3 4 1 10-4 11 0 6-6 9-11 7-2 5-8 7-12 4C66 54 48 62 30 62Z" />
          <path d="M27 54C26 49 30 43 38 40 47 38 58 40 61 46 63 50 58 55 52 57M24 49C23 40 30 30 44 26 58 23 76 26 82 35 85 42 76 51 66 54" fill="none" stroke="var(--palette-sand)" stroke-width="2.6" stroke-linecap="round" />
        </svg>
      );
    case "redfish":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 38c0-10 10-16 24-17 24-3 46 1 62 8l22-11-2 16 2 16-22-11c-16 7-38 11-62 10C16 48 6 46 6 38Z" />
          <path d="M34 21l10-12 10 11c-7 0-13 0-20 1ZM58 20c10-5 22-3 30 7-9-4-19-6-30-7ZM36 46l4 12 12-9c-6 0-11-1-16-3Z" />
          <circle cx="85" cy="33" r="4.4" fill="var(--palette-sand)" />
          <circle cx="19" cy="31" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "trout":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 36c6-8 20-11 36-11 22-1 40 2 54 6l20-9-2 12 2 12-20-9c-14 4-32 7-54 7-16 0-30-2-36-9Z" />
          <path d="M40 26l8-11 8 10c-5 0-11 0-16 1ZM62 25c8-4 16-3 22 4-7-2-14-3-22-4ZM36 43l4 10 10-7c-5 0-10-1-14-3Z" />
          <g fill="var(--palette-sand)">
            <circle cx="52" cy="31" r="2.4" />
            <circle cx="64" cy="30" r="2.4" />
            <circle cx="76" cy="32" r="2.4" />
            <circle cx="88" cy="33" r="2.4" />
            <circle cx="70" cy="38" r="2.4" />
          </g>
          <circle cx="16" cy="32" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "drum":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 44c4-14 18-30 38-32 20-1 36 8 48 18l20-8v26l-20-8c-12 8-30 14-48 13-18 0-32-3-38-9Z" />
          <path d="M40 13l8-10 10 10c-6-1-12-1-18 0Z" />
          <path d="M40 50l4 12 12-9c-6 0-11-1-16-3Z" />
          <path d="M12 49l-2 8M18 51l-1 8M24 52v8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
          <circle cx="22" cy="32" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "sheepshead":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 38c2-14 16-24 36-26 22-2 40 8 52 18l22-14-8 18 8 18-22-14c-12 10-30 18-52 18-20 0-34-6-36-18Z" />
          <path d="M34 14l3-8 4 7 3-8 4 7 3-8 4 8 3-7 4 8 3-6 3 8c-12-3-24-4-34-1Z" />
          <path d="M30 18v36M44 13v42M58 13v41M72 17v34M84 23v22" fill="none" stroke="var(--palette-sand)" stroke-width="3" stroke-linecap="round" />
          <circle cx="20" cy="30" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "grouper":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 34c6-10 18-16 32-17 24-2 46 2 62 13l14-12c10 6 10 26 0 32l-14-12c-16 11-38 16-62 15-14 0-26-5-32-13l22-5Z" />
          <path d="M36 17l3-6 4 5 3-6 4 5 3-5 4 5 3-5 4 6c8 1 16 4 22 10-16-6-34-8-50-9ZM40 48l4 11 12-8c-6 0-11-1-16-3Z" />
          <circle cx="22" cy="28" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "vermilion":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 36c10-7 24-11 40-11 18 0 36 3 50 8l24-17-10 22 10 22-24-17c-14 5-32 8-50 8-16 0-30-4-40-15Z" />
          <path d="M36 28l3-5 3 4 3-5 3 4 3-5 3 4 3-5 3 4 3-4 3 5c6 1 12 3 16 6-14-4-30-6-46-7ZM36 50l4 9 10-7c-5 0-10-1-14-2Z" />
          <circle cx="16" cy="33" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "mahi":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M6 48C3 36 4 22 10 14c10-6 30-4 50 2 14 4 26 10 34 15l22-19-8 24 8 24-22-19c-16 5-38 9-58 11-14 1-26 0-30-4Z" />
          <path d="M11 14C13 4 32 1 52 4c18 3 34 13 42 27-10-7-22-12-34-15-18-5-36-6-49-2ZM44 51c16-1 32-4 46-9-6 9-24 16-44 16Z" />
          <path d="M16 14c14-4 30-3 44 2 12 4 22 9 30 15" fill="none" stroke="var(--palette-sand)" stroke-width="2.6" stroke-linecap="round" />
          <circle cx="15" cy="34" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "tuna":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 36c10-14 30-20 52-20 18 0 32 7 40 16 6-10 12-20 22-30-4 12-8 22-10 34 2 12 6 22 10 30-10-8-16-18-22-28-8 9-22 16-40 16-22 0-42-6-52-18Z" />
          <path d="M54 17 64 0c0 6 0 12-2 18ZM52 52l12 15c0-6-1-10-3-15ZM36 18l4-8 6 7ZM72 18l3-4 2 5ZM80 21l3-4 2 6ZM72 51l3 5 3-6ZM80 48l3 5 3-7Z" />
          <circle cx="18" cy="32" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "swordfish":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M0 33 30 29v8ZM26 31c10-6 26-9 42-7 12 2 20 6 26 9 6-9 12-18 20-25-2 10-6 20-8 28 2 8 6 18 8 28-8-7-14-16-20-25-8 5-20 9-34 9-14 0-26-4-34-11Z" />
          <path d="M38 26 44 2c5 6 10 14 12 22ZM42 46l4 12 8-10c-4 0-8-1-12-2Z" />
          <circle cx="34" cy="31" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "triggerfish":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 38l6-4c8-10 20-18 34-20l22-6 22 22 24-12-6 18 6 18-24-12-22 22-22-6c-14-2-26-10-34-20Z" />
          <path d="M36 16 42 0l6 14Z" />
          <circle cx="32" cy="24" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "tripletail":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 38c2-14 16-22 36-22 18 0 32 6 42 16v8c-10 10-24 16-42 16-20 0-34-6-36-18Z" />
          <path d="M50 17C60 6 80 2 94 6c8 4 8 12 0 16-8 2-14 4-16 6-8-6-18-10-28-11ZM50 55c10 11 30 15 44 11 8-4 8-12 0-16-8-2-14-4-16-6-8 6-18 10-28 11ZM80 32c12-6 30-4 34 4-4 8-22 10-34 4Z" />
          <circle cx="18" cy="32" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "cobia":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 36l6-4c8-4 18-8 32-9 20-1 40 3 52 8l22-17-8 22 8 22-22-17c-12 5-32 9-52 8-16-1-28-4-38-11Z" />
          <path d="M36 24l3-6 3 5 3-6 3 5 3-6 3 6ZM60 23l10-11c4 4 6 10 6 13ZM60 49l10 11c4-4 6-10 6-13Z" />
          <path d="M22 37h68" fill="none" stroke="var(--palette-sand)" stroke-width="3" stroke-linecap="round" />
          <circle cx="14" cy="31" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "amberjack":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M3 37c7-11 21-18 39-19 20-1 38 5 50 13l24-19-8 24 8 24-24-19c-12 8-30 13-50 13-18 0-32-6-39-17Z" />
          <path d="M44 19l8-9c12 2 28 8 38 18-14-6-30-9-46-9ZM50 53l8 9c12-2 24-10 32-18-12 6-26 9-40 9Z" />
          <path d="M22 44 34 21" fill="none" stroke="var(--palette-sand)" stroke-width="3" stroke-linecap="round" />
          <circle cx="15" cy="31" r="3" fill="var(--palette-sand)" />
        </svg>
      );
    case "mackerel":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M2 35c12-6 28-9 46-9 18 0 34 3 46 6l22-16-8 20 8 20-22-16c-12 3-28 6-46 6-18 0-34-3-46-9Z" />
          <path d="M30 27l6-8c8 0 18 2 24 7ZM70 28l3-5 3 5ZM78 29l3-5 3 5ZM86 30l3-5 3 5ZM70 44l3 5 3-5ZM78 43l3 5 3-5ZM86 42l3 5 3-5Z" />
          <circle cx="16" cy="33" r="2.6" fill="var(--palette-sand)" />
        </svg>
      );
    case "mullet":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 36c0-8 8-12 20-12 24-2 48 0 68 6l22-14-6 20 6 20-22-14c-20 6-44 8-68 6-12 0-20-4-20-12Z" />
          <path d="M44 24l6-10 6 10ZM70 26l6-8 4 9Z" />
          <path d="M24 32h62M24 40h62" fill="none" stroke="var(--palette-sand)" stroke-width="2.6" stroke-linecap="round" />
          <circle cx="13" cy="33" r="2.8" fill="var(--palette-sand)" />
        </svg>
      );
    case "buffalo":
      return (
        <svg class="draw" viewBox="0 0 120 67" fill="currentColor" aria-hidden="true">
          <path d="M4 40c2-8 8-14 18-18 10-10 24-14 36-12 14 2 26 12 34 20l22-16-6 22 6 22-22-16c-12 8-30 12-48 12-18 0-34-4-40-14Z" />
          <path d="M48 11l8-10c14 2 26 12 34 25-10-8-24-14-42-15Z" />
          <path d="M40 54l4 10 10-8c-5 0-10-1-14-2Z" />
          <circle cx="15" cy="35" r="2.8" fill="var(--palette-sand)" />
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
