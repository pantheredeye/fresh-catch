---
title: "Design System Evolution"
created: 2026-04-04
poured:
  - fresh-catch-mol-5pk2g
  - fresh-catch-mol-iimsp
  - fresh-catch-mol-blon1
  - fresh-catch-mol-fga7e
iteration: 0
auto_discovery: false
auto_learnings: false
---

<!-- 
NOTE: REVIEW BEFORE POURING
Discussion needed on "what professional means" for the admin aesthetic.
Current admin feels "fake and cheap" per user. Need to align on:
- How neutral? Full Linear-style monochrome, or keep some brand warmth?
- One accent color — which? Ocean blue? Slate? Something new?
- Density: tighter admin spacing vs current spacious layout?
- Reference points to aim for: Linear, Stripe, Vercel — which resonates most?
- Should vendor storefronts keep the current gradient-rich style, or evolve too?

The customer-facing landing/storefront style is generally liked. This is mainly about 
the admin surface feeling like a real professional tool, and the menus feeling polished.

Have this conversation before pouring beads from this spec.
-->

<project_specification>
<project_name>Design System Evolution</project_name>
<overview>Three-part design system upgrade: (1) restyle admin to neutral management-plane aesthetic, (2) convert menus to Base UI with styling upgrade, (3) lay groundwork for vendor theming via token scoping. Admin currently uses coral gradients and glassmorphism — feels consumer-app, not professional tool. Customer storefront style is good, keep it.</overview>
<context>
  <existing_patterns>
    - Design tokens: src/design-system/tokens.css (three-tier system, dark mode support)
    - Admin layout: src/layouts/AdminLayout.tsx + AdminLayout.css (coral accents, gradient badges, glass exit section)
    - Admin pages: src/app/pages/admin/admin.css (dashboard cards, market config)
    - Customer layout: src/layouts/CustomerLayout.tsx (mesh gradients, spacious, gradient-rich)
    - Header: src/components/Header.tsx (variant="admin"|"customer"|"auth")
    - UserMenu: src/components/UserMenu.tsx + .css (Base UI Menu, properly styled)
    - BottomNav menu: src/app/pages/home/components/BottomNavigation.v2.tsx (manual state, 70 lines, no keyboard nav)
    - Base UI already installed: @base-ui/react ^1.0.0, proven in UserMenu
    - Admin uses coral accent (--color-coral, --color-coral-vivid: #FF5252)
    - Admin nav uses gradient underline on active tab
    - Admin badge: gradient secondary background (coral-orange)
    - Customer uses ocean blue primary (--color-action-primary: #0066CC)
  </existing_patterns>
  <integration_points>
    - tokens.css: add admin-specific token overrides (or separate admin-tokens layer)
    - AdminLayout.css: major restyle
    - Header.tsx variant="admin": remove gradient badge, go neutral
    - admin.css: dashboard cards, nav, badges — all need neutral treatment
    - BottomNavigation.v2.tsx: Base UI Menu conversion
    - Future: [data-theme] attribute on layout wrappers for vendor theming
  </integration_points>
  <new_technologies>
    - Base UI Menu components (already available, extend existing UserMenu pattern)
    - CSS cascade layers or data-attribute scoping for theme separation
  </new_technologies>
  <conventions>
    - All styling via design tokens (never raw hex)
    - Components adapt via props/variants, not duplication
    - Dark mode via @media (prefers-color-scheme: dark)
    - BEM-style class naming in CSS files
  </conventions>
</context>
<tasks>
  <task id="admin-restyle" priority="0" category="design">
    <title>Admin neutral management-plane aesthetic</title>
    <description>
Restyle the admin surface to feel like a professional management tool, not a consumer app. Current admin uses coral gradients, glassmorphism, and animated accents — reads as "fake and cheap." 

Direction: neutral palette, typography-driven hierarchy, one restrained accent color, no gradients on controls. Think Linear/Stripe/Vercel territory — the admin should feel like a tool you trust with your business.

Specific changes:
- AdminLayout.css: remove glass effects from exit section, simplify nav to clean horizontal tabs with subtle active indicator (not gradient underline)
- Header variant="admin": remove gradient ADMIN badge, replace with simple text badge (neutral bg, small, uppercase)
- Admin nav: one accent color for active state (not coral gradient), clean bottom border
- admin.css dashboard cards: remove hover transforms, use subtle border highlight instead
- Admin color tokens: define admin-specific overrides — neutral grays, one blue accent, no coral on admin surfaces
- Typography: let weight and size do the hierarchy work, reduce color usage for emphasis
- Spacing: tighten slightly for higher information density (admin users want data, not atmosphere)

Reference research: Linear (disappearing chrome, purple accent sparingly), Vercel (black/white, monospace, developer-grade clarity), Stripe (indigo accent, trustworthy professionalism). See emdash admin: React + Tailwind + CVA, neutral professional aesthetic.

Files: src/layouts/AdminLayout.css, src/components/Header.tsx + Header.css, src/app/pages/admin/admin.css, src/design-system/tokens.css (admin token layer)
    </description>
    <steps>
      - Define admin color token overrides (can be a [data-surface="admin"] scope in tokens.css or a separate section)
      - Admin accent: choose one color (likely ocean blue --color-action-primary or a new slate-blue)
      - Restyle AdminLayout.css: clean header, simple nav tabs, remove glass/gradient effects
      - Restyle Header admin variant: plain text badge, neutral colors
      - Restyle admin.css: dashboard cards with subtle borders instead of hover transforms, tighter spacing
      - Remove coral accent from admin surfaces (keep it for customer-facing only)
      - Audit all admin pages for gradient usage, replace with flat colors
      - Test dark mode still works with admin token overrides
      - Compare before/after screenshots for sentiment check
    </steps>
    <test_steps>
      1. Admin dashboard feels professional and neutral (no gradients on controls)
      2. Active nav tab has clean indicator, not gradient underline
      3. ADMIN badge is subtle, not eye-catching
      4. Dashboard cards don't bounce on hover
      5. Dark mode admin looks intentional, not broken
      6. Customer pages still have their gradient-rich, friendly style
      7. No coral/orange appears on admin surfaces
    </test_steps>
    <review></review>
  </task>
  <task id="menu-base-ui" priority="1" category="ux">
    <title>Base UI menu conversion + styling upgrade</title>
    <description>
Convert the BottomNavigation "..." menu from manual state management to Base UI Menu components (matching the existing UserMenu.tsx pattern). Also upgrade the menu styling — current menu feels plain compared to the rest of the bottom nav.

The conversion removes ~70 lines of manual state/positioning/backdrop code, replaces with ~15 lines of Base UI components, and gains keyboard navigation, ARIA roles, focus management, and proper positioning via Floating UI.

Also audit for other manual dropdown/menu patterns in the codebase and convert them.

Style upgrade ideas for the "..." menu:
- Icons per menu item (Profile, Settings, Share, Logout)
- Subtle left-border accent on hover/highlighted item
- Entry animation: slide-up + fade, slight stagger per item
- Trigger morphs from "..." to "X" on open (rotation transition)
- Match the FreshSheet card quality (that catch card looks great)

Files: src/app/pages/home/components/BottomNavigation.v2.tsx, new BottomNavigation.css or inline → CSS
    </description>
    <steps>
      - Study UserMenu.tsx + UserMenu.css as the reference pattern
      - Replace BottomNavigation menu state (menuOpen, setMenuOpen, backdrop div) with Menu.Root/Trigger/Portal/Positioner/Popup/Item
      - Create CSS for the menu (can be in BottomNavigation.css or a new file)
      - Style: use design tokens, match quality of the rest of the bottom nav
      - Add icons to menu items
      - Add entry animation (slide-up + fade)
      - Trigger: "..." morphs to "X" on open (CSS transition on [data-state="open"])
      - Test keyboard nav: arrow keys, escape, enter/space
      - Test screen reader: proper roles announced
      - Audit codebase for other manual dropdown patterns, list them for future conversion
    </steps>
    <test_steps>
      1. "..." menu opens with slide-up animation
      2. Arrow keys navigate items, Escape closes, Enter activates
      3. Screen reader announces "Menu" role and item labels
      4. "..." morphs to "X" on open
      5. Menu items have icons and hover accent
      6. Menu auto-positions to stay in viewport
      7. Clicking outside closes menu
      8. Visual quality matches Chat and Quick Order buttons
    </test_steps>
    <review></review>
  </task>
  <task id="vendor-theme-groundwork" priority="2" category="architecture">
    <title>Vendor theming groundwork — token scoping via data attributes</title>
    <description>
Lay the foundation for vendor-customizable storefronts without building the full theme editor yet. The idea: admin = fixed neutral management plane, vendor storefront (/v/:slug) = themed per vendor.

Groundwork only — no UI for theme editing yet. Just the plumbing:
1. Add [data-surface="admin"] and [data-surface="vendor"] attributes to layout wrappers
2. Move admin-specific token overrides under [data-surface="admin"] scope
3. Add [data-vendor="slug"] attribute to CustomerLayout when viewing a specific vendor
4. Define a small set of vendor-configurable CSS custom properties (--vendor-accent, --vendor-accent-soft, --vendor-hero-bg)
5. Add accent_color field to org settings (just the DB field + admin input, no live preview yet)
6. Inject vendor CSS vars from org settings at render time in CustomerLayout

This sets up the architecture so a future "theme editor" bead just needs to add UI for picking colors/uploading images. The token scoping already works.

Files: src/layouts/AdminLayout.tsx, src/layouts/CustomerLayout.tsx, src/design-system/tokens.css, prisma schema (accent_color field), CustomerHome.tsx (inject vendor vars)
    </description>
    <steps>
      - Add data-surface="admin" to AdminLayout root div
      - Add data-surface="vendor" and data-vendor={slug} to CustomerLayout root div
      - Scope admin token overrides under [data-surface="admin"] in tokens.css
      - Define vendor-configurable CSS custom properties with defaults
      - Add accent_color (string, nullable) to Organization model in prisma schema
      - Migration for new field
      - Add color picker input to admin settings page (simple, just stores the value)
      - In CustomerLayout/CustomerHome: if org has accent_color, inject as --vendor-accent CSS var on wrapper
      - Document the token scoping pattern for future theme additions
    </steps>
    <test_steps>
      1. Admin pages render with [data-surface="admin"] attribute
      2. Customer pages render with [data-surface="vendor"] attribute
      3. Admin token overrides only apply inside admin layout (not leaking to customer)
      4. Setting accent_color in admin settings persists to DB
      5. Viewing vendor's storefront picks up --vendor-accent from org settings
      6. Default vendor styling unchanged when no accent_color set
      7. Dark mode works correctly with scoped tokens
    </test_steps>
    <review></review>
  </task>
</tasks>
</project_specification>
