# Design System Audit

Systematic review of all pages/components for design token compliance.

**Created:** 2026-02-01
**Goal:** Fix dark mode + establish consistent foundation

## Status

- [ ] Phase 0: Define missing tokens (`tokens.css`)
- [ ] Phase 1: ProfileUI (5 fixes, quick win)
- [ ] Phase 2: Login + JoinUI (undefined status tokens)
- [ ] Phase 3: Home components (swap rgba to tokens)
- [ ] Phase 4: Orders pages (NewOrderUI, OrderCard, CustomerOrdersUI)
- [ ] Phase 5: Admin pages (biggest volume)
- [ ] Phase 6: PrintOrders (print-specific, may need own approach)

## Key Decision: Library Strategy

Keeping homegrown token system + Base UI (headless). Not migrating to shadcn/Ark.
Focus: make tokens authoritative so LLMs can reference them consistently.

## Reference Files

- `src/design-system/tokens.css` - master token definitions
- `src/design-system/patterns.md` - design philosophy
- `docs/design-audit/` - this audit folder
