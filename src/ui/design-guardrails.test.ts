import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

// Vite resolves this glob at build time to string literals — no runtime `fs`
// access, which the Workers test runtime doesn't have. Same pattern as
// a11y.test.ts's colour-literal check.
const tsxSources = import.meta.glob("/src/**/*.tsx", { eager: true, query: "?raw", import: "default" }) as Record<
  string,
  string
>;

describe("no inline style= attrs in src/**/*.tsx", () => {
  it("every color, spacing, and layout choice goes through a token or a class", () => {
    const offenders = Object.entries(tsxSources)
      .filter(([, content]) => /\bstyle=/.test(content))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});

describe("no raw .btn class outside src/ui", () => {
  it("every button is built from the Button primitive, not a hand-written btn class", () => {
    const offenders = Object.entries(tsxSources)
      .filter(([path]) => !path.startsWith("/src/ui/"))
      .filter(([, content]) => /class="[^"]*\bbtn\b/.test(content))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});

// --- Token contrast --------------------------------------------------------

// import.meta.glob can't reach into public/ (it's served as-is, not part of
// the module graph) — fetch it through the ASSETS binding instead, same
// binding `wrangler dev`/deploy serve it through.
let styleCss: string;
let palette: Record<string, string>;

beforeAll(async () => {
  const res = await (env as unknown as { ASSETS: Fetcher }).ASSETS.fetch("http://localhost/style.css");
  styleCss = await res.text();
  palette = parsePalette(styleCss);
});

function parsePalette(css: string): Record<string, string> {
  const palette: Record<string, string> = {};
  for (const match of css.matchAll(/--palette-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    palette[match[1]] = match[2];
  }
  return palette;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Tideline palette contrast (docs/redesign/fresh-catch-handoff.md §3)", () => {
  it("parsed every expected palette token from public/style.css", () => {
    for (const name of [
      "sand",
      "paper",
      "shallow",
      "shallow-line",
      "deep",
      "sea",
      "muted",
      "muted-soft",
      "coral",
      "coral-fill",
      "line",
      "on-sea-muted",
      "on-deep-muted",
    ]) {
      expect(palette[name], `--palette-${name} not found`).toBeDefined();
    }
  });

  it("has no prefers-color-scheme: dark block — light-only per locked decision", () => {
    expect(styleCss).not.toMatch(/prefers-color-scheme:\s*dark/);
  });

  // Body/small text — 7:1 floor (WCAG AAA), not the default 4.5:1.
  const textPairs: Array<[string, string]> = [
    ["deep", "paper"],
    ["deep", "sand"],
    ["muted", "paper"],
    ["muted", "sand"],
    ["sea", "paper"],
    ["paper", "sea"],
    ["sand", "deep"],
    ["on-sea-muted", "sea"],
    ["on-deep-muted", "deep"],
    // #75 audit — pairs already rendered pre-#75 but not previously pinned:
    ["deep", "shallow"], // .notice-info text on its background
    ["paper", "muted"], // .strip.shut (closed status strip)
    ["coral", "paper"], // .field-error text on a paper form/card surface
  ];

  it.each(textPairs)("%s on %s meets the 7:1 text floor", (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(7);
  });

  // Large text / graphic elements (badge fills) — 4.5:1 floor.
  const largeTextPairs: Array<[string, string]> = [
    ["deep", "coral-fill"],
    ["coral", "shallow"],
    ["coral", "sand"],
    ["muted", "shallow"], // .badge-past (also badge-fulfilled)
    ["muted-soft", "sand"], // .fish.out h3 + struck price (sold-out row)
  ];

  it.each(largeTextPairs)("%s on %s meets the 4.5:1 large-text/graphic floor", (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  // Input/control borders — 3:1 non-text floor. --palette-line on paper is
  // ~1.6:1 (decorative-only); form controls use --palette-sea instead.
  it("sea on paper meets the 3:1 non-text control-border floor", () => {
    expect(contrast(palette.sea, palette.paper)).toBeGreaterThanOrEqual(3);
  });

  it("line on paper is documented as sub-3:1 (decorative borders only, never a control boundary)", () => {
    expect(contrast(palette.line, palette.paper)).toBeLessThan(3);
  });
});
