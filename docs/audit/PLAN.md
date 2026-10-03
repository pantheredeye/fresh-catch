# Audit Plan — fresh-catch rebuild

## Goal
Scrap current app (RWSDK 1.4.1 / CF Workers / D1+Prisma / Stripe). Produce a rebuild spec
an agent fleet can build from. 4 parallel audit lanes, then synthesis.

## Lanes
1. `docs/audit/features.md` — feature inventory, keep/kill map, mic→landing regression root cause
2. `docs/audit/data-stripe.md` — schema audit, minimal target data model, Stripe carry-forward
3. `docs/audit/auth-platform.md` — auth pain points, cruft inventory, simplest-auth + stack rec
4. `docs/audit/ux-a11y.md` — customer-page tokens/style guide, WCAG contrast for 60+ outdoor users, dark mode state

## Keep-list (locked)
1. Manager mic button voice-updates catch-of-the-week rendering on landing page (currently broken regression)
2. Customers see/favorite/track markets Evan attends
3. Evan edits market details incl. popup markets
4. NEW: customers request fish → saved + alert to Evan → he responds (Evan keeps no records, app must)
5. Keep customer-page styling, scrap admin theme
6. A11y-first: 60+ outdoor customers, high contrast, large targets, dark mode planned from day 1
7. Auth must be drastically simpler
8. Stripe live (keys+webhook, Connect activated) — payments optional later

## Next
On all 4 lane docs landing: synthesize into `docs/audit/REBUILD-PLAN.md`.
