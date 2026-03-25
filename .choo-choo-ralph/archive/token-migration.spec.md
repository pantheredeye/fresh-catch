---
title: "Three-Tier Semantic Token Migration"
created: 2026-02-16
poured:
  - fresh-catch-mol-i8z
  - fresh-catch-mol-0ig
  - fresh-catch-mol-qyy
  - fresh-catch-mol-e4a
  - fresh-catch-mol-h4j
  - fresh-catch-mol-eu2
  - fresh-catch-mol-ah4
  - fresh-catch-mol-e3k
  - fresh-catch-mol-6a7
  - fresh-catch-mol-k01
iteration: 1
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Three-Tier Semantic Token Migration</project_name>

  <overview>
    Migrate CSS design tokens from flat brand names (--deep-navy, --ocean-blue) to three-tier semantic names (--color-text-primary, --color-action-primary) across all CSS files and inline styles. The three-tier JSON (tokens-three-tier.json) defines the naming convention. Currently 10+ semantic tokens are referenced but undefined (silently broken), 14+ hardcoded hex values exist in admin.css, and ~103 uses of --deep-navy need migrating across 28 files.
  </overview>

  <context>
    <existing_patterns>
      - tokens.css (611 lines) is the master token file with :root definitions + dark mode via @media (prefers-color-scheme: dark)
      - Two partial aliases already exist: --text-primary: var(--deep-navy), --text-secondary: var(--cool-gray)
      - Utility classes (.heading-5xl, .body-md, .text-primary etc) defined in tokens.css reference old flat names
      - scripts/export-tokens.js parses tokens.css and exports to Figma-compatible tokens.json
      - Design system components use inline style={{ }} with var(--token-name) pattern
      - COMPONENT_TEMPLATE.tsx shows the expected token usage pattern for new components
    </existing_patterns>
    <integration_points>
      - src/design-system/tokens.css - all token definitions live here
      - src/design-system/tokens-three-tier.json - source of truth for semantic naming
      - scripts/export-tokens.js - will need updating after migration to export new token names
      - 8 CSS files total across src/ (tokens.css, admin.css, AdminLayout.css, UserMenu.css, Header.css, AuthLayout.css, CustomerLayout.css, dark-mode-test.css)
      - ~29 TSX files with inline styles using var(--old-name) tokens
      - src/design-system/patterns.md and README.md - documentation to update
    </integration_points>
    <new_technologies>
      - No new technologies. Pure CSS custom property renaming.
    </new_technologies>
    <conventions>
      - Spacing tokens (--space-xs/sm/md/lg/xl/2xl) stay as-is, already semantic
      - Radius tokens (--radius-sm/md/lg/xl/full) stay as-is
      - Shadow tokens (--shadow-sm/md/lg/coral/gold) stay as-is
      - Font size uses --font-size-* only (no --text-sm shorthands)
      - New color naming: --color-{category}-{variant} (e.g. --color-text-primary, --color-action-primary)
      - Context-dependent mapping: --coral becomes --color-action-secondary (buttons) OR --color-status-error (alerts)
      - Dark mode overrides must be added for every new semantic token
    </conventions>
  </context>

  <tasks>
    <task id="define-semantic-tokens" priority="0" category="infrastructure">
      <title>Define semantic token aliases in tokens.css</title>
      <description>
        Add all semantic alias tokens to :root in tokens.css so the 10+ undefined references start working. Also add motion tokens (--duration-fast, --duration-normal, --ease-out) that are referenced but undefined. Add corresponding dark mode overrides. Old flat tokens remain defined for backward compat during migration.
      </description>
      <steps>
        - Add semantic color aliases to :root block in src/design-system/tokens.css:
          --color-text-primary: var(--deep-navy)
          --color-text-secondary: var(--cool-gray)
          --color-text-tertiary: var(--soft-gray)
          --color-text-inverse: white
          --color-action-primary: var(--ocean-blue)
          --color-action-primary-hover: #0052A3
          --color-action-secondary: var(--coral)
          --color-action-secondary-accent: #FFB366
          --color-status-success: var(--mint-fresh)
          --color-status-warning: var(--warm-gold)
          --color-status-error: var(--coral)
          --color-accent-gold: var(--warm-gold)
          --color-surface-primary: var(--surface-primary)
          --color-surface-secondary: var(--light-gray)
          --color-surface-warm: var(--warm-white)
          --color-surface-overlay: rgba(0,0,0,0.5)
          --color-border-subtle: var(--border-subtle)
          --color-border-light: var(--border-light)
          --color-border-medium: var(--border-medium)
          --color-border-input: #E8EFF5
          --color-border-input-disabled: #CBD5E1
        - Add motion tokens:
          --duration-fast: 150ms
          --duration-normal: 300ms
          --ease-out: cubic-bezier(0.33, 1, 0.68, 1)
        - Add dark mode overrides for all new semantic tokens in @media (prefers-color-scheme: dark) block
        - Remove the now-redundant partial aliases (--text-primary, --text-secondary) since they're replaced by --color-text-primary/secondary
      </steps>
      <test_steps>
        1. Run pnpm run dev - no build errors
        2. Check AdminLayout.css, UserMenu.css, AuthLayout.css styles now render correctly (they reference these tokens)
        3. Toggle dark mode in browser - semantic tokens adapt properly
        4. Grep for "undefined" CSS variables in browser DevTools on admin and auth pages
      </test_steps>
      <review></review>
    </task>

    <task id="fix-admin-css-hardcodes" priority="1" category="functional">
      <title>Replace hardcoded hex values in admin.css</title>
      <description>
        admin.css has 14+ hardcoded hex colors. Replace all with semantic tokens. Also convert any remaining old flat token refs (--deep-navy, --cool-gray) to semantic names.
      </description>
      <steps>
        - In src/app/pages/admin/admin.css:
          Replace #1A1A2E (4x) with var(--color-text-primary)
          Replace #6B7280 (5x) with var(--color-text-secondary)
          Replace #E8EFF5 (3x) with var(--color-border-input)
          Replace #F3F4F6 (1x) with var(--color-surface-secondary)
          Replace #CBD5E1 (1x) with var(--color-border-input-disabled)
          Replace raw "white" backgrounds with var(--color-surface-primary)
        - Remove doubled declarations (e.g. "color: #1A1A2E; color: var(--deep-navy)" becomes single "color: var(--color-text-primary)")
        - Convert any var(--deep-navy) to var(--color-text-primary), var(--cool-gray) to var(--color-text-secondary), etc.
      </steps>
      <test_steps>
        1. Run pnpm run dev
        2. Visit admin pages - verify no visual changes in light mode
        3. Toggle dark mode - verify admin styles adapt correctly (previously broken with hardcoded hex)
        4. Grep admin.css for any remaining hex values (#)
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-css-layout-files" priority="1" category="functional">
      <title>Migrate layout and component CSS files to semantic tokens</title>
      <description>
        Convert remaining CSS files from flat brand names to semantic names. Files that already partially use new names just need the remaining old refs converted.
      </description>
      <steps>
        - Migrate src/components/UserMenu.css: convert remaining var(--deep-navy), var(--cool-gray), var(--ocean-blue), var(--coral) refs. Fix any var(--text-xs/sm) to var(--font-size-xs/sm).
        - Migrate src/layouts/AdminLayout.css: same conversions. Fix var(--text-*) shorthands.
        - Migrate src/layouts/AuthLayout.css: convert flat token refs to semantic.
        - Migrate src/components/Header.css: convert flat token refs to semantic.
        - Migrate src/layouts/CustomerLayout.css: convert any flat token refs.
        - Mapping: --deep-navy -> --color-text-primary, --cool-gray -> --color-text-secondary, --ocean-blue -> --color-action-primary, --coral -> --color-action-secondary or --color-status-error (context), --surface-primary -> --color-surface-primary, --light-gray -> --color-surface-secondary, --warm-white -> --color-surface-warm, --mint-fresh -> --color-status-success, --warm-gold -> --color-status-warning or --color-accent-gold (context), --border-subtle/light/medium -> --color-border-subtle/light/medium
      </steps>
      <test_steps>
        1. Run pnpm run dev
        2. Visit pages using each layout (admin, auth, customer) - no visual changes
        3. Check UserMenu dropdown and Header render correctly
        4. Toggle dark mode - all layouts adapt
        5. Grep these files for any remaining old flat token names
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-dark-mode-test" priority="2" category="functional">
      <title>Migrate dark mode test page CSS to semantic tokens</title>
      <description>
        Convert dark-mode-test.css from hardcoded hex values to semantic tokens so it tests the actual token system's dark mode behavior rather than independent hardcoded values.
      </description>
      <steps>
        - In src/app/pages/dark-mode-test/dark-mode-test.css: replace all hardcoded hex/rgba values with semantic token references
        - Update DarkModeTestUI.tsx if it has inline styles with old tokens
      </steps>
      <test_steps>
        1. Visit /dark-mode-test page
        2. Toggle dark mode - all test swatches should adapt via tokens
        3. Compare against expected token values
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-tokens-css-utilities" priority="1" category="functional">
      <title>Update utility classes in tokens.css to use semantic tokens</title>
      <description>
        The utility classes (.heading-5xl, .body-md, .text-primary, .caption etc) in tokens.css reference old flat names like var(--deep-navy) and var(--cool-gray). Update them to use semantic names.
      </description>
      <steps>
        - In src/design-system/tokens.css utility classes section:
          Replace var(--deep-navy) with var(--color-text-primary) in all .heading-* and .body-* classes
          Replace var(--cool-gray) with var(--color-text-secondary) in .caption and .text-secondary classes
          Replace var(--ocean-blue) with var(--color-action-primary) in .text-order-number
          Update .text-primary class to use var(--color-text-primary)
          Update .text-secondary class to use var(--color-text-secondary)
        - Also update the placeholder styling rule (input::placeholder) to use var(--color-text-secondary)
        - Update .btn--outline:hover and .btn--ghost:hover if they use old names
      </steps>
      <test_steps>
        1. Run pnpm run dev
        2. Check pages using utility classes - headings, body text, captions render correctly
        3. Toggle dark mode - utility classes adapt
        4. Grep tokens.css for remaining var(--deep-navy) and var(--cool-gray) outside :root definitions
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-design-system-tsx" priority="2" category="functional">
      <title>Migrate design system component inline styles</title>
      <description>
        Update the 14 design system TSX files to use semantic tokens in their inline style={{ }} blocks. These are the most-imported components so they have the highest impact.
      </description>
      <steps>
        - Migrate each file, replacing old token refs in style={{ }} with semantic equivalents:
          1. src/design-system/Button.tsx
          2. src/design-system/components/FormControls.tsx
          3. src/design-system/components/Input.tsx
          4. src/design-system/components/LoginForm.tsx
          5. src/design-system/components/ShareModal.tsx
          6. src/design-system/components/Badge.tsx
          7. src/design-system/components/FreshBadge.tsx
          8. src/design-system/components/Card.tsx
          9. src/design-system/components/SectionHeader.tsx
          10. src/design-system/components/NavGrid.tsx
          11. src/design-system/components/QRCodeGenerator.tsx
          12. src/design-system/components/FreshHero.tsx
          13. src/design-system/components/InputDemo.tsx
          14. src/design-system/COMPONENT_TEMPLATE.tsx
        - Same mapping: --deep-navy -> --color-text-primary, --ocean-blue -> --color-action-primary, etc.
        - For --coral: use --color-action-secondary on buttons/CTAs, --color-status-error on error states
        - For --warm-gold: use --color-accent-gold on favorites, --color-status-warning on warnings
      </steps>
      <test_steps>
        1. Run pnpm run types - no type errors
        2. Visit /design-test page - all design system components render correctly
        3. Toggle dark mode - all components adapt
        4. Grep src/design-system/ for remaining old flat token names in style={{ }} blocks
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-admin-pages-tsx" priority="2" category="functional">
      <title>Migrate admin page inline styles</title>
      <description>
        Update admin page TSX files to use semantic tokens. These have the heaviest inline style usage.
      </description>
      <steps>
        - Migrate inline styles in:
          1. src/app/pages/admin/components/AdminOrderCard.tsx (~25 old token refs)
          2. src/app/pages/admin/AdminOrdersUI.tsx (~10 refs)
          3. src/app/pages/admin/components/CompactMarketCard.tsx (~10 refs)
          4. src/app/pages/admin/components/MarketFormModal.tsx (~7 refs)
          5. src/app/pages/admin/Setup.tsx (~7 refs)
        - Same mapping as other phases
      </steps>
      <test_steps>
        1. Run pnpm run dev
        2. Visit admin dashboard, orders, market config pages
        3. Verify no visual regressions in light mode
        4. Toggle dark mode - admin pages adapt correctly
        5. Grep these files for old flat token names
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-customer-pages-tsx" priority="2" category="functional">
      <title>Migrate customer page inline styles</title>
      <description>
        Update customer-facing page TSX files to use semantic tokens.
      </description>
      <steps>
        - Migrate inline styles in:
          1. src/app/pages/orders/components/OrderCard.tsx (~16 refs)
          2. src/app/pages/user/JoinUI.tsx (~12 refs)
          3. src/app/pages/user/Login.tsx (~11 refs)
          4. src/app/pages/orders/NewOrderUI.tsx (~10 refs)
          5. src/app/pages/user/JoinPage.tsx (~6 refs)
          6. src/app/pages/home/components/MarketCard.tsx (~5 refs)
        - Same mapping as other phases
      </steps>
      <test_steps>
        1. Run pnpm run dev
        2. Visit home, orders, login, join pages
        3. Verify no visual regressions
        4. Toggle dark mode - customer pages adapt
        5. Grep these files for old flat token names
      </test_steps>
      <review></review>
    </task>

    <task id="migrate-remaining-tsx" priority="3" category="functional">
      <title>Migrate remaining page component inline styles</title>
      <description>
        Update the remaining ~12 TSX files with lower old-token ref counts: ProfileUI, DesignTest, DarkModeTestUI, BottomNavigation variants, FreshHero variants, NavItem, LiveBanner, CustomerFooter, Document.tsx, etc.
      </description>
      <steps>
        - Grep entire src/ for remaining var(--deep-navy), var(--cool-gray), var(--ocean-blue), var(--coral), var(--warm-gold), var(--mint-fresh), var(--light-gray), var(--warm-white), var(--surface-primary) in TSX files
        - Migrate each found instance to semantic equivalent
        - Check for any hardcoded hex values that should also become tokens
      </steps>
      <test_steps>
        1. Run pnpm run types
        2. Run pnpm run dev - full app smoke test
        3. Toggle dark mode across all pages
        4. Final grep: zero old flat token names remaining in any TSX file
      </test_steps>
      <review></review>
    </task>

    <task id="cleanup-old-tokens" priority="3" category="infrastructure">
      <title>Remove old flat token definitions and cleanup</title>
      <description>
        Once all files are migrated, remove old flat token names from :root and dark mode blocks. Update semantic tokens to use raw values instead of referencing old aliases. Update the Figma export script and documentation.
      </description>
      <steps>
        - Grep entire codebase for any remaining old token references - must be zero
        - In tokens.css :root: change semantic tokens from var(--deep-navy) to #1A2B3D directly (remove indirection)
        - Remove old flat token definitions (--deep-navy, --ocean-blue, --coral, --warm-gold, --mint-fresh, --cool-gray, --light-gray, --warm-white, --soft-gray, --mint-green, --sky-blue)
        - Keep --ocean-gradient and --coral-gradient (brand gradients, still semantic)
        - Update dark mode block to override semantic tokens directly
        - Remove old --text-primary / --text-secondary aliases (replaced by --color-text-primary/secondary)
        - Update scripts/export-tokens.js to export new token names
        - Delete src/design-system/tokens.json (flat format, replaced by three-tier)
        - Update src/design-system/patterns.md with new naming convention
        - Update src/design-system/README.md with new token reference
      </steps>
      <test_steps>
        1. Run pnpm run types - no errors
        2. Run pnpm run dev - full app visual check
        3. Toggle dark mode - everything works
        4. Run pnpm run tokens:export - generates valid export
        5. Grep entire src/ for any old flat token name - zero results
        6. Verify no CSS property resolves to undefined in browser DevTools
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Zero old flat token names (--deep-navy, --ocean-blue, etc.) remaining in any CSS or TSX file
    - Zero hardcoded hex color values in CSS files
    - Zero undefined CSS custom properties across the app
    - All semantic tokens have dark mode overrides
    - No visual regressions in light mode
    - Dark mode works correctly across all pages
    - Documentation updated to reflect new naming
  </success_criteria>
</project_specification>
