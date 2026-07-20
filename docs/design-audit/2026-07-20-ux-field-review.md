# UX Field Review — Customer Home & Order Flow

**Date:** 2026-07-20
**Source:** Founder walkthrough of the live app (market.digitalglue.dev) as a signed-out / customer user
**Scope:** Diagnosis only — no code changes. Each observation is traced to its root cause in code, with the concept for a fix. Items are tagged **Quick Win** (small, isolated change) or **Overhaul** (belongs in the larger design pass, see bottom).

---

## 1. Blue schedule text in All Markets rows looks like a link — and hides the real tap target

**Observation:** In the All Markets list, the blue time entry ("Sat 8am–12pm") looks tappable, and it's scary to tap. Meanwhile the actual affordance — tap the row to expand market details — is invisible. The builder knows the row is tappable; a user doesn't.

**Root cause:** Two reinforcing problems in `src/app/pages/home/components/CompactMarketRow.tsx`:

- The schedule is styled `color: var(--color-action-primary)` at `CompactMarketRow.tsx:90` — the same ocean blue used for buttons and links app-wide. In a design system, the action color is a promise ("this does something"). Using it as a data highlight breaks that promise. Same pattern in `MarketCard.tsx:81`.
- The row itself (`CompactMarketRow.tsx:48-67`) has correct semantics (`role="button"`, `aria-expanded`, keyboard handling — nicely done) but **zero visual affordance**: no background change on press, no hint text, and the only signal is a small tertiary-gray `›` chevron at the far right, after the star. A 60+ user scanning outdoors in sunlight will never infer "tap anywhere on this row."

**Concept:**
- Schedule text → neutral (`--color-text-primary` or `--color-text-secondary`, keep the semibold weight for scanability). Reserve blue strictly for actions. **Quick Win**
- Give the row a visible affordance: chevron pointing **down** when collapsed (the `›`-rotates-to-`˅` convention reads as "navigates away" when sideways), an active/pressed background state (`:active { background: var(--color-surface-secondary) }`), and/or an explicit "Details" label next to the chevron. For this audience, explicit beats subtle — a small "Details ˅" text button communicates more than any amount of styling. **Quick Win** for the states; label/layout tweaks could ride with the overhaul.

---

## 2. Hero quick actions: "Markets" and "Contact" buttons do nothing

**Observation:** The big icon buttons in the hero — the marketing/contact ones — are dead. Order and My Orders work.

**Root cause:** `src/app/pages/home/fetchVendorData.ts:5-13`:

```ts
{ icon: "🐟", title: "Order", href: orderHref },        // real route ✓
{ icon: "📋", title: "My Orders", href: "/orders" },    // real route ✓
{ icon: "📍", title: "Markets", href: "#markets" },     // ✗ no element with id="markets" exists
{ icon: "💬", title: "Contact", href: "#text" }         // ✗ no element with id="text" exists
```

Grep confirms no `id="markets"` or `id="text"` anywhere in `src/` — those anchors are pointing at nothing, so the browser silently no-ops. Same class of bug: the 📍 Directions buttons in both `MarketCard.tsx:154` and `CompactMarketRow.tsx:193` link to `#directions-{id}`, which also has no target anywhere. **Three dead affordances shipped to production**, all placeholder hrefs that were never wired up.

**Note:** This hero (`FreshHero`) only renders when there's no live catch data — when a catch update is live, `FreshSheet` renders instead (`CustomerHomeUI.tsx:113-117`), which has no quick actions at all. So the dead buttons show precisely in the "empty" state where a new visitor lands.

**Concept:**
- "Markets": add `id="markets"` to the All Markets section and smooth-scroll, or drop the button. **Quick Win**
- "Contact": wire to the chat sheet (the working chat in the bottom nav), an `sms:`/`tel:` link to the vendor, or drop it. Needs a product decision on what "Contact" means. **Quick Win once decided**
- "Directions": either build the maps handoff (`https://maps.google.com/?q=` + address — the Market model would need address data surfaced) or remove the pin buttons until it exists. A dead button is worse than no button. **Quick Win (remove) / small feature (wire up)**

---

## 3. Order / My Orders work, but with zero feedback — taps feel dead, then the page "races"

**Observation:** Tap Order, nothing visibly happens, so you tap something else — then the new page lands and it feels like a race. No indication the button did anything, and honestly no strong indication it *is* a button.

**Root cause:** This is the single biggest "web page, not web app" contributor, and it's structural:

- Navigation is **full-page browser navigation**. `src/client.tsx` calls `initClient()` only — RWSDK's client navigation (`initClientNavigation()`) is not enabled. Every `<a href>` is a full document round-trip: server render, D1 queries (`fetchVendorData` runs 3 queries), possibly a Workers/D1 cold start.
- The app is an installed PWA with `"display": "standalone"` (`public/manifest.json:5`) — so there's **no browser chrome, no URL bar spinner**. The one loading indicator the browser normally provides is hidden. Result: tap → 1–3 seconds of literally nothing → new page.
- No button-level feedback either: the NavGrid cards (`design-system/components/NavGrid.tsx`) and nav links are plain anchors with hover transitions but no `:active`/pressed state and no in-flight state.

**Concept (in order of leverage):**
1. **Enable client navigation** (`initClientNavigation()` in `client.tsx`) so RSC-based transitions replace full reloads. This is the RWSDK 1.x intended pattern and the foundation for everything else. Needs testing across the auth/session/tenant middleware. **Overhaul — do first, it changes what else is needed**
2. **Global navigation progress indicator** — a thin top progress bar (or overlay spinner) that appears the moment any navigation starts. With client nav this is a hook; without it, a small `document`-level click listener on same-origin links can still flip a "loading" class before the browser unloads. **Quick Win version possible now; proper version rides on #1**
3. **Pressed states everywhere.** Every tappable element gets `:active` scale/color feedback (e.g. `transform: scale(0.97)` + background shift, `transition: 80ms`). Cheap, instant, and for older users the confirmation that "yes, you pressed it." Belongs in the design system as a shared `.pressable` behavior, not per-component. **Quick Win**
4. Once #1 lands: disable/spinner the specific tapped control during the transition to prevent double-fire.

---

## 4. Mic button does nothing when signed out

**Observation:** The microphone button on the fab bar doesn't do anything for a logged-out user. Chat works.

**Root cause:** Confirmed bug, not perception. The mic button always renders (`BottomNavigation.tsx:196-217`) and calls `openCommandBar()`, which sets `commandBarOpen = true` in `CustomerLayoutClient`. But the `CommandBar` component is only mounted **inside `{user && (...)}`** at `CustomerLayoutClient.tsx:115-117`. Signed out: state flips, nothing is mounted, silent no-op.

**Concept:** Pick one:
- Hide the mic when `!user` (simplest, honest UI), or
- Keep it and have it open the `AuthSheet` (`src/components/AuthSheet.tsx` already exists as the account-creation trigger for exactly this kind of host) — "Sign in to use voice ordering." Better funnel, slightly more work.
Either way, a visible control must never silently no-op. **Quick Win**

---

## 5. Header on the order form: "+ Order" and "Sign In" buttons are mismatched sizes

**Observation:** In the order form page header, the Order button is small, the Sign In button is bigger. Looks strange.

**Root cause:** Two adjacent buttons styled in two different CSS files with different specs:

| | `.order-button` (`Header.css:68-80, 142-146`) | `.sign-in-button` (`UserMenu.css:3-17`) |
|---|---|---|
| Vertical padding | `--space-xs` (mobile: xs too) | `--space-sm` |
| Font size | `--text-sm` (mobile: `--text-xs`) | `--text-sm` (no mobile shrink) |
| Radius | `--radius-full` (pill) | `--radius-md` (rounded rect) |
| Background | coral gradient | blue gradient |

So on mobile they diverge in height, text size, *and* shape. There's also a third variant of "the Order pill" in `BottomNavigation.tsx:176-193` with its own inline styles. This is the cost of not having a `Button` primitive actually used in these spots — the design system has one (`src/design-system/Button.tsx`) but the header/nav don't use it.

**Extra:** on the order form page specifically, the header's "+ Order" links to `/orders/new` — the page you're already on. It arguably shouldn't render there at all.

**Concept:** One shared button primitive (size + radius from a single spec; color variants only), consumed by Header, UserMenu, and BottomNavigation. Hide or swap the header Order CTA on `/orders/new`. **Quick Win for the size alignment; primitive consolidation → Overhaul**

---

## 6. "Feels like a web page, not a web app" — the professionalism gap

**Observation:** The theme is right and stays. But sizing, spacing, margins, and general flow don't feel modern/professional-tier.

**Diagnosis — concrete contributors found in code:**

1. **No perceived performance layer** (item #3): full reloads with zero feedback is 80% of the "web page" feel. Modern-feeling apps are mostly *feedback*, not speed.
2. **Competing max-widths:** sections use `maxWidth: '500px'` hard-coded (`CustomerHomeUI.tsx:178, 231, 285`, `QuickActions.tsx:31`) while the hero uses `var(--width-md)` (`FreshHero.tsx:31`). If those differ, content edges don't align vertically down the page — an instant "off" feeling nobody can name.
3. **Spacing is per-component, not rhythmic:** every section brings its own padding (`var(--space-lg) var(--space-md)` here, `var(--space-xl)` there, `paddingBottom: '100px'` magic number in `CustomerHomeUI.tsx:230`). There's no vertical rhythm scale (e.g. all section gaps = `--space-xl`, all card innards = `--space-md`). Professional layouts are mostly consistent rhythm.
4. **Shadow/elevation soup:** cards use `--shadow-md`, buttons `--shadow-md`, nav `--shadow-lg`, plus one-off `--shadow-coral`. Everything floats equally, so nothing has hierarchy. Pick 2 elevation levels for this surface.
5. **Token violations undermining the system:** raw `rgba()` in the home mesh gradient (`CustomerHomeUI.tsx:100-104`), NavGrid border colors (`NavGrid.tsx:119-124`), FreshSheet item chips (`FreshSheet.tsx:67`) — all things CLAUDE.md itself bans. Also hard-coded `fontSize: '32px'/'14px'/'20px'` in NavGrid. This is the existing `docs/design-audit/phase-3-home.md` work.
6. **Emoji as iconography** (🐟 📋 📍 💬 ⚙️ 🎙️ ⭐): renders differently per platform, can't take the theme's color, and reads homespun. A single-weight icon set (Lucide/Phosphor, stroke width tuned up for visibility) is probably the single biggest visual "professionalism" upgrade that doesn't touch the theme.
7. **Inline styles everywhere** means no shared `:active`/`:focus`/`:hover` behavior and drift like #5 above. Not a user-visible issue per se, but it's why the inconsistencies keep appearing.

**What's genuinely good and should not be lost:** the ocean gradient identity, big type in the hero, generous tap targets where they exist (52px star, 64px rows), `aria-*` and keyboard handling on the expanding rows, `prefers-reduced-motion` support, the county-grouped card list structure. The bones are right.

---

## Priority order

### Quick wins (each small, independently shippable)
1. **Dead controls:** wire or remove `#markets`, `#text`, `#directions-*` (items 2) and fix/hide signed-out mic (item 4). *A visible control must never no-op.*
2. **Navigation feedback:** minimal top loading bar + `:active` pressed states app-wide (item 3, interim version).
3. **Blue schedule → neutral**, add row pressed state + downward chevron (item 1).
4. **Header button alignment** on one shared size spec; hide "+ Order" on the order page itself (item 5).

### Overhaul pass (the "adversarial" design review — separate branch/worktree)
Scope for a dedicated ticket:
- **Enable RWSDK client navigation** + real transition indicators (foundation).
- **Layout rhythm:** one content max-width token, one vertical spacing scale, 2-level elevation system.
- **Button/pressable primitive** consumed everywhere (Header, UserMenu, BottomNav, NavGrid, row CTAs).
- **Icon system** replacing emoji.
- **Finish the token audit** (`docs/design-audit/` phases 0 & 3 cover most of the home-page violations).
- **Constraint:** keep the theme (gradients, coral/ocean palette, big friendly type). Keep and extend the accessibility posture — 60+, outdoor sunlight, big targets, high contrast, explicit labels over clever minimalism.

**Process note (per founder):** do the overhaul on an isolated branch/worktree so it can be evaluated against the current UI and discarded if it loses the plot. Current app works; the overhaul must earn its merge.
