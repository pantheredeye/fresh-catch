# UX + A11y Audit — Customer Surface (for from-scratch rebuild)

Scope: `src/design-system/`, `scripts/export-tokens.js`, `src/layouts/Customer*`, customer page components under `src/app/pages/{home,markets,orders,profile,user}`. Read-only static analysis; dev server not started (not needed — all styling is token/inline-style based and fully visible in source).

Owner constraint driving every recommendation below: **customers are 60+, using the app outdoors in sun glare.** That means AAA contrast (not just AA) should be the default target, type should run larger than typical web defaults, and touch targets need real thumb margin.

---

## 1. Portable token set (customer palette, as extracted)

Source: `src/design-system/tokens.css` (:root block, light mode). This is what's worth carrying into the rebuild — the visual identity the owner likes.

### CSS variables

```css
:root {
  /* Typography */
  --font-modern: 'DM Sans', -apple-system, system-ui;
  --font-display: 'DM Sans', system-ui;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 28px;
  --font-size-4xl: 32px;
  --font-size-5xl: 40px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.2;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.6;

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 20px;
  --space-lg: 28px;
  --space-xl: 40px;
  --space-2xl: 56px;

  /* Widths */
  --width-sm: 450px;
  --width-md: 800px;
  --width-lg: 1200px;
  --width-xl: 1400px;

  /* Radii */
  --radius-xs: 6px;
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 36px;
  --radius-full: 9999px;

  /* Shadows (colored — brand signature) */
  --shadow-sm: 0 2px 8px rgba(0,102,204,0.08);
  --shadow-md: 0 8px 24px rgba(0,102,204,0.12);
  --shadow-lg: 0 20px 40px rgba(0,102,204,0.15);
  --shadow-xl: 0 25px 50px rgba(0,102,204,0.2);
  --shadow-coral: 0 8px 24px rgba(255,107,107,0.2);
  --shadow-gold: 0 8px 24px rgba(245,158,11,0.2);

  /* Color — text */
  --color-text-primary: #1A2B3D;
  --color-text-secondary: #64748B;
  --color-text-tertiary: #94A3B8;
  --color-text-inverse: #FFFFFF;

  /* Color — actions */
  --color-action-primary: #0066CC;
  --color-action-primary-hover: #0052A3;
  --color-action-secondary: #FF6B6B;   /* coral */
  --color-action-secondary-accent: #FFB366;

  /* Color — status */
  --color-status-success: #00D9B1;      /* mint */
  --color-status-warning: #F59E0B;      /* gold */
  --color-status-error: #FF6B6B;
  --color-accent-gold: #F59E0B;

  /* Color — surfaces / backgrounds */
  --color-surface-primary: #FFFFFF;
  --color-surface-secondary: #F1F5F9;
  --color-surface-warm: #FFFCF8;
  --color-bg-primary: #FFFCF8;
  --color-bg-elevated: #FFFFFF;

  /* Color — borders */
  --color-border-subtle: rgba(0,102,204,0.08);
  --color-border-light: rgba(0,102,204,0.12);
  --color-border-medium: rgba(0,102,204,0.2);
  --color-border-input: #E8EFF5;

  /* Gradients (brand signature) */
  --color-gradient-primary: linear-gradient(135deg, #0066CC, #00A896);
  --color-gradient-secondary: linear-gradient(135deg, #FF6B6B, #FFB366);

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
}
```

### JSON (portable token map)

```json
{
  "typography": {
    "fontFamily": { "display": "DM Sans", "body": "DM Sans", "mono": "SF Mono" },
    "fontSize": { "xs": 12, "sm": 14, "md": 16, "lg": 18, "xl": 20, "2xl": 24, "3xl": 28, "4xl": 32, "5xl": 40 },
    "fontWeight": { "normal": 400, "medium": 500, "semibold": 600, "bold": 700 },
    "lineHeight": { "tight": 1.2, "base": 1.5, "relaxed": 1.6 }
  },
  "spacing": { "xs": 8, "sm": 12, "md": 20, "lg": 28, "xl": 40, "2xl": 56 },
  "radius": { "xs": 6, "sm": 12, "md": 20, "lg": 28, "xl": 36, "full": 9999 },
  "color": {
    "text": { "primary": "#1A2B3D", "secondary": "#64748B", "tertiary": "#94A3B8", "inverse": "#FFFFFF" },
    "action": { "primary": "#0066CC", "primaryHover": "#0052A3", "secondary": "#FF6B6B", "secondaryAccent": "#FFB366" },
    "status": { "success": "#00D9B1", "warning": "#F59E0B", "error": "#FF6B6B" },
    "accentGold": "#F59E0B",
    "surface": { "primary": "#FFFFFF", "secondary": "#F1F5F9", "warm": "#FFFCF8" },
    "bg": { "primary": "#FFFCF8", "elevated": "#FFFFFF" },
    "border": { "subtle": "rgba(0,102,204,0.08)", "light": "rgba(0,102,204,0.12)", "input": "#E8EFF5" },
    "gradient": {
      "primary": "linear-gradient(135deg, #0066CC, #00A896)",
      "secondary": "linear-gradient(135deg, #FF6B6B, #FFB366)"
    }
  },
  "shadow": {
    "sm": "0 2px 8px rgba(0,102,204,0.08)",
    "md": "0 8px 24px rgba(0,102,204,0.12)",
    "lg": "0 20px 40px rgba(0,102,204,0.15)",
    "coral": "0 8px 24px rgba(255,107,107,0.2)",
    "gold": "0 8px 24px rgba(245,158,11,0.2)"
  },
  "motion": { "fast": "150ms", "normal": "300ms", "ease": "cubic-bezier(0.33, 1, 0.68, 1)" }
}
```

Not worth porting as-is: the `--color-glass-*` / `--color-tint-*` / `--color-nav-accent-*` layer (18+ ad-hoc rgba tokens) — decorative glassmorphism dressing, not core identity, and the biggest source of dark-mode breakage (see §3). `[data-surface="admin"]` overrides are scoped out per the owner's decision to scrap the admin theme.

---

## 2. Contrast audit (computed, WCAG relative-luminance formula)

Ran actual ratio math (Python, sRGB relative luminance) against the token pairs used for real text/buttons. AA normal-text threshold = 4.5:1, AA large-text (≥18px, or ≥14px bold) = 3:1, AAA normal-text = 7:1.

| Pair | Ratio | AA-normal | AAA-normal | Verdict for 60+/outdoor |
|---|---|---|---|---|
| `text-primary` on `bg-primary` (#1A2B3D/#FFFCF8) | 14.09 | ✅ | ✅ | Great, keep |
| `text-primary` on `surface-primary` (#1A2B3D/#FFF) | 14.41 | ✅ | ✅ | Great, keep |
| `text-secondary` on `bg-primary` (#64748B/#FFFCF8) | 4.65 | ✅ | ❌ | **Bump for AAA** — this is used for captions, helper text, metadata everywhere |
| `text-tertiary` on `bg-primary` (#94A3B8/#FFFCF8) | 2.51 | ❌ | ❌ | **Fails AA entirely.** Only safe for large/decorative use, never body copy |
| `action-primary` text/link on white (#0066CC/#FFF) | 5.57 | ✅ | ❌ | Passes AA, fails AAA — bump for buttons/links |
| `action-primary-hover` on white (#0052A3/#FFF) | 7.68 | ✅ | ✅ | Already AAA — good candidate as the *default*, not just hover |
| primary button white text on `#0066CC` fill | 5.57 | ✅ (AA both sizes) | ❌ | Fine for 18px+ bold button labels at AA; misses AAA |
| coral (`action-secondary`) text/icon on white (#FF6B6B) | 2.78 | ❌ | ❌ | **Fails AA even at large-text.** Never use as text color |
| mint (`status-success`) text on white (#00D9B1) | 1.82 | ❌ | ❌ | **Fails badly.** Fine as a fill *behind* dark/white text, never as text itself |
| gold (`status-warning`/`accent-gold`) text on white (#F59E0B) | 2.15 | ❌ | ❌ | Same — fill only, never text |
| `border-input` on white (#E8EFF5) | 1.16 | n/a (decorative) | n/a | Fine — borders aren't text, but this border is nearly invisible; bump for visibility, not contrast compliance |
| **Dark mode** — `text-primary` on `bg-primary` (#E2E8F0/#111827) | 14.39 | ✅ | ✅ | Great |
| **Dark mode** — `text-secondary` on `bg-primary` (#94A3B8/#111827) | 6.92 | ✅ | ❌ | Close to AAA, small bump needed |

### Adjusted values that keep the palette's character but clear AAA

Computed by darkening along the same hue until the ratio target is hit (not just clamping to black):

```css
/* AAA-safe variants — use these as the default, not edge cases */
--color-text-secondary: #4C596A;      /* was #64748B — now 7:1 on warm bg, AAA */
--color-text-tertiary:  #627794;      /* was #94A3B8 — now 4.5:1, usable for real text (was fully non-compliant) */
--color-action-primary: #0052A3;      /* was #0066CC — now 7.68:1, AAA as default link/text color; keep #0066CC only in gradients/fills */

/* Status colors: keep AS-IS for fills/badges/icons, but define text-safe variants
   for whenever the color needs to render as text or a small icon glyph on white */
--color-action-secondary-text: #B60000; /* coral, AAA-safe text variant (was #FF6B6B → 2.78:1, unusable as text) */
--color-status-success-text:   #006553; /* mint, AAA-safe (was #00D9B1 → 1.82:1) */
--color-status-warning-text:   #7C5005; /* gold, AAA-safe (was #F59E0B → 2.15:1) */
```

**Practical rule for the rebuild:** treat coral/mint/gold as *fill colors only* (badge backgrounds, button gradients, icon backdrops) paired with white/dark text on top — never render them as the foreground color of text or a thin icon stroke on a light surface. Where a status needs to communicate via colored text (e.g., "3 available" in mint), use the darker `-text` variant above, not the base token.

The border-input token (`#E8EFF5`, 1.16:1 against white) is close to invisible — bump to something like `#C7D6E3` for actual visible input outlines outdoors.

---

## 3. Dark mode: current implementation, gaps, day-1 plan

### How it works today
- Pure `@media (prefers-color-scheme: dark)` block in `tokens.css` overriding ~46 `:root` custom properties. No manual toggle, no persisted user preference, no `localStorage`/cookie override — it's 100% OS-driven.
- `src/app/Document.tsx:10` sets `<meta name="color-scheme" content="light">` — this **conflicts** with `worker.tsx`'s inline critical CSS (`:root { color-scheme: light dark; }`, line 111, used only on the error page). The `light`-only meta tag forces native UA chrome (scrollbars, checkbox/radio/select control skins, date pickers) to stay light-themed even when the page content flips to dark via the media query. Net effect: in dark mode, native form controls render as light widgets floating in dark content — a real, currently-shipping bug, not hypothetical.
- Retrofitted late: dozens of one-off `rgba(255,255,255,0.X)` "glass" values across components had to be re-derived per-token for dark mode (`--color-glass-*`, `--color-tint-*`, `--color-nav-accent-*` — 18+ tokens exist solely to patch glassmorphism surfaces that don't naturally invert). This is the single largest source of dark-mode surface area and fragility: any new component that hardcodes `rgba(255,255,255,...)` instead of a glass token silently breaks in dark mode (the design-system README explicitly calls this out as the #1 gotcha).
- Admin surface (`[data-surface="admin"]`) carries its own dark-mode override block, doubling the maintenance surface — moot for the rebuild since admin is being scrapped.

### What a day-1 dark mode should do differently
1. **Fix the `color-scheme` conflict at the root**: set `color-scheme: light dark` (not `light`) on `:root`/the document meta from day one, so native controls always match content theme.
2. **Design the token set dark-first, or at least dual-first** — pick every color as a *pair* (light value, dark value) at authoring time rather than writing light tokens then back-deriving dark. This directly avoids the glass/tint/nav-accent token sprawl that happened here as a patch layer.
3. **Avoid `rgba(white, X)` / `rgba(black, X)` as a styling primitive entirely.** Every "glass" or "tint" surface should be a named semantic token from the start (`--color-surface-glass`, `--color-tint-brand`) with light/dark values baked in, never an inline literal alpha-white.
4. **Consider whether dark mode matters much for this audience at all** before investing heavily: the core use case is outdoors in daylight at a farmers market. Dark mode mainly matters for early-morning/dusk market setup or indoor admin use (which is out of scope). A manual toggle (not just OS-driven) is arguably lower priority than nailing outdoor daylight contrast — call this out to the owner as a sequencing question, not an assumption.
5. If keeping OS-driven dark mode, still add `color-scheme: light dark` and test native form controls (select, checkbox, radio, date input) explicitly — they were the gap here.

---

## 4. Interaction a11y: touch targets, type, focus, motion

### Touch targets
- **Standard button (`Button` size=`md`)**: `padding: 14px 24px`, no explicit `minHeight` — effective height depends on font-size + padding, roughly ~48-50px with 16px text. `size=lg` explicitly sets `minHeight: 48px`. `size=sm` sets `minHeight: 36px` — **below the 44px minimum**, used wherever a compact button appears.
- **Voice-command mic button** (`BottomNavigation.tsx:233-234`): hardcoded `width: 36px; height: 36px` — **fails the 44px minimum** for a frequently-tapped, thumb-zone footer control. This is a top interaction fix for the rebuild.
- **Radio button visual indicator** is 20×20px, but the tappable area is the full label row (`padding: var(--space-md)` = 20px all around), so effective target is comfortably >44px — fine as-is.
- **Toggle switch (`sm`)**: 38×22px control, but wrapped in a full-width label row with `cursor: pointer` — tappable area is the row, not just the switch, so acceptable, though the visual switch itself is small for someone with reduced fine motor control.
- **Badge / NotificationBadge**: 16-20px — not intended as tap targets (decorative/informational), fine.

### Font sizes
- Body default is 16px (`--font-size-md`), body-lg is 18px — reasonable baseline.
- **`--font-size-xs` (12px) is used for labels, captions, helper text, error text across every form control** (`Input.tsx`, `FormControls.tsx` label/helper/error styles are all hardcoded `12px`, not even tokenized to `--font-size-xs`). For 60+ users this is the single biggest legibility risk — error messages and field labels are the *last* thing that should be small.
- Uppercase + letter-spacing labels (`.label-sm`, `.label-md`) compound the problem: uppercase reduces the word-shape cues older readers rely on, at a size that's already too small.

### Focus states
- `--color-focus-ring` token exists in `tokens.css` but is used in only **two** places: `src/app/pages/admin/catch/catch.css` and `src/components/command-review.css`. It is **not applied** to the core `Button`, `TextInput`, `Select`, or `TimeInput` components in the design system — `TextInput`/`Select` explicitly set `outline: 'none'` with no compensating focus box-shadow (only an *error*-state box-shadow exists, which isn't the same thing and doesn't fire on focus). Keyboard/switch-device users get no visible focus indicator on the most common form controls.
- Where focus-visible *is* implemented well: `bottom-nav-menu-item` (`BottomNavigation.css`) has a proper `:focus-visible { outline: 2px solid ... }`. Use this as the reference pattern app-wide in the rebuild.

### Motion
- `interactions.css` (global press feedback) correctly gates the `scale(0.97)` press transform behind `@media (prefers-reduced-motion: no-preference)`, keeping the `filter: brightness()` feedback either way — good pattern, worth keeping verbatim.
- `BottomNavigation.css`'s menu-popup slide-up animation correctly disables under `prefers-reduced-motion: reduce`.
- **Gap**: `fresh-bounce` (used by `FreshBadge`) and `live-pulse` (used by `FreshBadge` and `LiveBanner`) are *infinite* looping animations (`animation: fresh-bounce 2s ease-in-out infinite` / `live-pulse 1.5s...infinite`) with **no `prefers-reduced-motion` guard at all**. These are exactly the class of animation (small, continuous, peripheral motion) most likely to bother vestibular-sensitive users, and they're unguarded.

### Concrete standards to carry into the rebuild
- Minimum 48×48px tap target for every interactive control, no exceptions for "compact" variants in the footer/nav (kill the 36px mic button and `size=sm` button's 36px min-height).
- Minimum 16px for any input text (already the case for md/lg inputs — good), and **minimum 14px, never 12px, for labels/captions/errors** — bump `--font-size-xs` usage in form components to `--font-size-sm` (14px) as the floor, and prefer 16px for anything error-related since it's often read under time pressure.
- Every focusable element gets a real `:focus-visible` ring using the existing `--color-focus-ring` token, applied at the design-system component level (`Button`, `TextInput`, `Select`, links) — not opt-in per page.
- Any `infinite`/looping CSS animation must be wrapped in `@media (prefers-reduced-motion: no-preference)` with a static fallback state, no exceptions — audit for this at component-review time, not after the fact.
- AAA contrast (7:1) as the default bar for body/label text given the outdoor-glare constraint, not AA (4.5:1) — see §2 for the specific value swaps.

---

## 5. Customer pages whose look must survive (screenshot/reference targets)

All served through `CustomerLayout` (`data-surface="vendor"`), sharing the header (`unified-header--customer`, logo + "+ Order" CTA + user menu) and `BottomNavigation`/`CustomerFooter`.

| Route | Component | Notes |
|---|---|---|
| `/` | `CustomerHome` / `CustomerHomeUI.tsx` | Primary landing page — fresh-catch hero, vendor directory, quick actions. Highest-visibility page, most representative of the "Instagram-ready market fresh" identity. |
| `/<vendor-slug>` (vendor profile) | `VendorProfilePage.tsx` | Per-vendor branded view — pulls `accentColor` override via `CustomerLayoutClient`'s `--vendor-accent` CSS var swap. |
| `/orders` | `CustomerOrdersPage` / `CustomerOrdersUI.tsx` | Order history/list — status badges, card list pattern. |
| `/orders/new` | `NewOrderPage` / `NewOrderUI.tsx` | Order form — heaviest use of `Input`/`Select`/`RadioGroup`/`TimeInput` from the design system; good page to validate the token/focus/font-size fixes against. |
| `/profile` | `ProfilePage` / `ProfileUI.tsx` | Account/profile settings. |
| `/markets/past` | `PastPopupsPage` / `PastPopupsUI.tsx` | Archive feed for expired popup markets ([[project_popup_markets]] context). |
| `/login` | `LoginPage` / `Login.tsx` / `AuthCard.tsx` | Email-OTP auth entry — `Header variant="auth"` (centered logo only), glassmorphism `Card variant="centered"`. |
| `/join/invite` | `AcceptInvitePage` / `AcceptInviteUI.tsx` | Invite-acceptance flow, same auth-card styling as login. |
| `/design-test` (dev-only) | — | Not a real customer page, but the fastest way to visually diff every design-system primitive at once (light + dark) before/after the rebuild — worth screenshotting as a baseline even though it won't exist in production. |

Not in scope (owner scrapping): everything under `/admin/*` (`data-surface="admin"`), and the neutral admin token overrides in `tokens.css`.

---

## Summary of top actionable findings
1. Coral/mint/gold tokens are unusable as text color (1.8–2.8:1) — fills/badges only; use the AAA-safe darkened variants (§2) if they must render as text.
2. `text-secondary`/`text-tertiary` fail AAA (and tertiary fails AA outright) — bump both (§2).
3. `color-scheme` meta conflict (`light` in `Document.tsx` vs `light dark` in worker.tsx) breaks native form-control theming in dark mode.
4. No visible focus ring on `Button`/`TextInput`/`Select` — `--color-focus-ring` token exists but isn't wired into the design system.
5. 36×36px mic button and `size=sm` button (36px min-height) fall under the 44/48px touch-target floor.
6. 12px labels/captions/errors on every form control — too small for the stated 60+/outdoor audience.
7. `fresh-bounce`/`live-pulse` infinite animations have no `prefers-reduced-motion` guard.
8. Glassmorphism `rgba(white/black, X)` literals are the root cause of most dark-mode fragility — avoid as a pattern in the rebuild, use paired tokens from day one.
