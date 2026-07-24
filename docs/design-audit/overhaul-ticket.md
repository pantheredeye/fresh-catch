# Ticket: Design Overhaul Pass — "Web App, Not Web Page"

**Status:** OPEN — not started
**Created:** 2026-07-20
**Origin:** [2026-07-20 UX field review](./2026-07-20-ux-field-review.md) (founder walkthrough of market.digitalglue.dev)
**Process:** Run on an isolated worktree/branch. The overhaul must earn its merge against the current UI — if it loses the plot, discard it and keep what works.

## Non-negotiable constraints

- **Keep the theme.** Ocean gradients, coral/ocean palette, big friendly display type stay.
- **Keep the accessibility posture.** Audience is 60+ customers at outdoor markets in sunlight: high contrast, big tap targets (≥48px), explicit labels over clever minimalism, obvious navigation over fancy patterns.
- **Web app first.** Still a RedwoodSDK web app; React Native / Capacitor is a future option, not this ticket.

## Scope

1. **Client navigation foundation** — enable `initClientNavigation()` (currently `client.tsx` only calls `initClient()`, so every tap is a full document reload with no feedback in the standalone PWA). Test against auth/session/tenant middleware. Real transition indicators replace the interim progress bar shipped in the quick wins.
2. **Layout rhythm** — one content max-width token (today: hard-coded `500px` in home sections vs `var(--width-md)` in the hero), one vertical spacing scale for section gaps, kill magic numbers (`paddingBottom: '100px'`).
3. **Elevation system** — 2 levels max on the customer surface (today cards/buttons/nav all float at similar shadow weights, so nothing has hierarchy).
4. **Pressable/Button primitive** — one shared spec consumed by Header, UserMenu, BottomNavigation, NavGrid, and row CTAs (today: three independently-styled "Order" pills exist).
5. **Icon system** — replace emoji iconography (🐟📋📍💬⚙️🎙️) with a single-weight icon set (Lucide/Phosphor), stroke width tuned up for outdoor visibility.
6. **Finish the token audit** — phases 0 and 3 of this folder cover most home-page violations (raw rgba mesh gradient, NavGrid border colors, hard-coded font sizes).

## Method (when started)

Adversarial multi-agent review → converge → implement on worktree:
1. Fan-out review: independent passes over layout rhythm, interaction feedback, hierarchy/elevation, accessibility, and "modern app flow" — each producing findings with file:line evidence into this folder.
2. Adversarial verify: second wave tries to refute each finding against the constraints above (especially "keep the theme" and 60+ accessibility).
3. Synthesize into a phased implementation plan appended to this ticket.
4. Implement phase-by-phase on the worktree branch; screenshot compare against production before merge.

## Reporting

- Findings and phase reports live in this folder (`docs/design-audit/`), one file per phase, linked from the README status table.
- The README status list is the single source of truth for what's done.
