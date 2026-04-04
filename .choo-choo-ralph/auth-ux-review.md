# UX, Design & Architecture Review — 2026-04-04

## Source: First-time user journey on market.digitalglue.dev + conversation

---

## Conversation Summary

Started from two screenshots of the mobile experience: the landing page (strong — soft onboarding working well, catch display, Chat/Quick Order/... bottom nav) and the registration flow (too many screens, contrast issue, password-only).

Branched into three workstreams:

### 1. Auth & Onboarding UX
- Registration flow has unnecessary intermediate "no account found" confirm screen
- Cyan info banners have poor contrast (--color-status-info on --color-text-primary ~3:1)
- No passkey option at registration (only password)
- No PWA manifest or install-to-homescreen
- Login polish: autocomplete hints, skippable countdown redirect
- Soft onboarding already good — landing page shows market data without auth

**Spec**: `auth-onboarding.spec.md` (3 beads: flow polish, passkey at signup, PWA install)

### 2. Auth Security Pass
- Password hashing solid (PBKDF2-SHA256, 600k iterations)
- Security headers well configured (HSTS, CSP, X-Frame-Options)
- HIGH: No rate limiting on auth endpoints
- HIGH: No account lockout after failed attempts
- HIGH: Email enumeration via checkEmailExists
- MEDIUM: Weak password complexity (8 chars only)
- MEDIUM: No CSRF tokens (partial protection from POST+JSON)

**Spec**: `security-pass.spec.md` (5 beads, already pouring)

### 3. Design System Evolution
- Admin aesthetic feels "fake and cheap" — coral gradients, glassmorphism on a management tool
- BottomNav "..." menu: manual state, no keyboard nav, plain styling compared to rest
- Base UI already installed and proven in UserMenu.tsx — extend pattern
- Admin should go neutral/professional (Linear/Stripe/Vercel territory)
- Customer storefront style is liked — keep the gradients and warmth there
- Vendor theming direction: management plane (fixed, neutral) vs storefront (themed per vendor)
- Token scoping via data attributes: [data-surface="admin"] vs [data-surface="vendor"]

**Spec**: `design-system-evolution.spec.md` (3 beads: admin restyle, Base UI menus, vendor theme groundwork)
**Note**: Review "what professional means" before pouring. Discussion needed on accent color, density, reference points.

### 4. MCP Per Vendor
Discovered that the existing voice tool registry (voice-tools.ts) is already 80% of an MCP server. Four phases planned:

- **Phase 1**: MCP scaffold + read-only tools + Claude Desktop connectivity
- **Phase 2**: Customer chat AI agent — answers when vendor offline, tags [AI], vendor can take over, logs unanswerable questions as product signal
- **Phase 3**: Write tools (orders, catch updates) + migrate command bar from hardcoded router to MCP client
- **Phase 4**: Customer command bar (voice ordering) + simple cross-vendor queries (who's at this market, where's this vendor, other vendors in county)

**Spec**: `mcp-per-vendor.spec.md` (4 beads, one per phase)
**Vision doc**: `mcp-per-vendor-vision.md` (scenarios for vendor/customer/voice, architecture, capability model)

Architecture concepts discussed:
- Capability-mediated agent execution (object-capability model / POLA)
- Three-layer model: host/management plane → agent/execution plane → client/presentation plane
- Event-driven autonomy (agents react to host events within capability bounds)
- Cloudflare primitives: Dispatch Worker, Dynamic Worker, Service Bindings
- Claude Desktop connects to MCP servers — vendor manages business conversationally

### 5. Base UI Research
- Already installed (@base-ui/react ^1.0.0), proven in UserMenu.tsx
- Headless/unstyled — existing token system layers perfectly on top
- Menu conversion: 70 lines manual → ~15 lines Base UI, identical visuals + keyboard nav/ARIA/focus
- Recommendation: stick with Base UI (already in deps), don't migrate to Radix/Headless UI/Ark
- Only convert interactive overlays (menus, dropdowns, selects) — buttons/inputs/cards stay custom

### 6. emdash / Cloudflare Reference
- emdash: themes as complete Astro projects, admin is fixed neutral UI
- Plugin sandboxing via Dynamic Workers with capability manifests
- Admin stack: React + Tailwind + CVA, neutral professional aesthetic
- Reference admin UIs: Linear (monochrome, disappearing chrome), Vercel (black/white, Geist), Stripe (indigo accent, trustworthy)
- Cross-cutting principle: neutral base, semantic accents, typography-driven hierarchy, single brand accent used sparingly

---

## UX Terms Referenced
- **Yellow Fade Technique** (37signals): flash rows with yellow wash before action
- **Choreographed Dismissal**: staggered exit animations
- **Object-Capability Model**: agents get scoped authority, not full sessions
- **POLA** (Principle of Least Authority): agents only get the permissions they need

---

## All Specs Created

| Spec | Beads | Status |
|------|-------|--------|
| `security-pass.spec.md` | 5 | Pouring |
| `auth-onboarding.spec.md` | 3 | Ready |
| `design-system-evolution.spec.md` | 3 | Review before pour (discuss admin aesthetic) |
| `mcp-per-vendor.spec.md` | 4 | Ready |

**Total**: 15 beads across 4 specs

---

## Unresolved Questions

1. Passkey at registration: side-by-side buttons or sequential?
2. PWA: install-to-homescreen only, or plan for offline later?
3. Admin aesthetic: how neutral? which accent color? which reference resonates most?
4. MCP transport: Streamable HTTP confirmed for Workers, but verify SDK support
5. Chat agent: AI-first (always responds, vendor overrides) or AI-only-when-offline?
6. Cross-vendor queries: any privacy concerns with public market data?

---

## Memories Created/Updated

- `project_mcp_architecture.md` — MCP server per vendor direction
- `feedback_autonomy_tension.md` — control vs autonomy, user interactions as product signal
- `feedback_tone.md` — conversational, not LinkedIn-performative
