---
title: "Market Browser Design Refresh"
created: 2026-04-03
poured:
  - fresh-catch-mol-ou0q
  - fresh-catch-mol-m9xg
  - fresh-catch-mol-yg16
  - fresh-catch-mol-np58
  - fresh-catch-mol-h5bl
  - fresh-catch-mol-1vnt
  - fresh-catch-mol-ewl2
  - fresh-catch-mol-yf6m
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Market Browser Design Refresh</project_name>

  <overview>
    Evan has ~8 markets across 5-8 counties in north Mississippi. The current customer home page renders all markets as full-height MarketCards (~200px each), creating 1600px+ of scrolling on mobile. This refresh introduces a hybrid layout: favorited markets shown as refreshed cards at the top, all other markets displayed as compact expandable rows grouped by county.

    Single branch: bbb-market-browser

    Target audience: older adults at outdoor farmers markets in north Mississippi. Light mode is primary — sunlight readability is critical. Use 18px (var(--font-size-lg)) as base readable font size. Large tap targets (52px+), high contrast, no horizontal scrolling, clear wayfinding via county group headers. Progressive enhancement — county data is nullable and populated later.

    Design principle: compact rows must NOT feel like a data table. Use "list card" pattern — county groups wrapped in rounded card containers with the same surface/shadow treatment as MarketCards. Inner rows separated by subtle dividers. Maintains the premium card-based design language.
  </overview>

  <context>
    <existing_patterns>
      - CustomerHomeUI at `src/app/pages/home/CustomerHomeUI.tsx`: "use client" component that receives markets/popups/catchData from server component. Uses `useFavorites()` hook. Renders YourMarketsSection (favorited markets as MarketCards) and AllMarketsSection (all markets as MarketCards).
      - MarketCard at `src/app/pages/home/components/MarketCard.tsx`: ~150px tall card with market name, schedule, subtitle, catch preview, favorite toggle (star), Order Fish / Manage Market button, directions pin. Uses inline styles with design tokens.
      - `useFavorites()` at `src/hooks/useFavorites.ts`: localStorage-based `[favorites, toggleFavorite, clearFavorites]` hook. Stores array of market IDs.
      - fetchVendorData at `src/app/pages/home/fetchVendorData.ts`: server-side data fetching, returns markets/popups/catchData. Markets fetched with `db.market.findMany({ where: { organizationId, active: true, type: "regular" } })`.
      - PopupCard at `src/app/pages/home/components/PopupCard.tsx`: separate card style for popup markets — different from regular MarketCard.
      - Market model: id, organizationId, name, schedule, subtitle, locationDetails, customerInfo, active, type, expiresAt, catchPreview (JSON), notes, rawTranscript, cancelledAt. NO county/city fields currently.
      - Component barrel export at `src/app/pages/home/components/index.ts`
    </existing_patterns>
    <integration_points>
      - `prisma/schema.prisma` — add county, city fields to Market model
      - `migrations/0022_add_market_county_city.sql` — ALTER TABLE Market ADD COLUMN
      - `src/app/pages/home/fetchVendorData.ts` — include county/city in market data, update sort order
      - `src/app/pages/home/CustomerHomeUI.tsx` — refactor AllMarketsSection to county-grouped CompactMarketRows, keep YourMarketsSection as MarketCards
      - `src/app/pages/home/components/MarketCard.tsx` — design refresh for favorites display
      - `src/app/pages/home/components/index.ts` — add CompactMarketRow export
      - Market type definitions in CustomerHomeUI.tsx and MarketCard.tsx — add county/city
    </integration_points>
    <new_technologies>
      - None. All changes use existing React, CSS, Prisma patterns.
    </new_technologies>
    <conventions>
      - Design tokens: `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`. Never hardcode hex.
      - Inline styles preferred (existing pattern throughout codebase)
      - Feature components in `src/app/pages/[feature]/components/` with barrel export
      - "use client" for interactive components
      - Accessibility: min 48px touch targets, 16px+ text for older adults
    </conventions>
  </context>

  <tasks>

    <task id="market-schema-county" priority="0" category="infrastructure">
      <title>Add county and city fields to Market schema</title>
      <description>
        Add nullable county and city string fields to the Market model. These will be populated later by the user for Evan's ~8 markets. The UI gracefully handles null values by grouping under "Other".

        Persona: Cloudflare backend engineer — Prisma schema, D1 SQLite ALTER TABLE.
      </description>
      <steps>
        - Add `county String?` and `city String?` to Market model in `prisma/schema.prisma`
        - Write `migrations/0022_add_market_county_city.sql`: two ALTER TABLE statements
        - Run `pnpm run generate` to regenerate Prisma client
      </steps>
      <test_steps>
        1. `pnpm run migrate:dev` applies cleanly
        2. `pnpm run generate` succeeds
        3. `pnpm run types` passes
        4. Existing market CRUD still works (fields are nullable, no data loss)
      </test_steps>
      <review></review>
    </task>

    <task id="fetch-vendor-data-update" priority="1" category="functional">
      <title>Include county/city in market data and update sort order</title>
      <description>
        Update the fetchVendorData function to include county and city in market data returned to the client. Sort markets by county → city → name for logical grouping.

        Persona: RWSDK full-stack engineer — server-side data fetching, Prisma orderBy, type definitions.
      </description>
      <steps>
        - In `src/app/pages/home/fetchVendorData.ts`: add `county` and `city` to the market query select (they're already included by default with findMany, but verify)
        - Update orderBy to `[{ county: 'asc' }, { city: 'asc' }, { name: 'asc' }]` — Prisma handles nulls-first by default in SQLite
        - Update the return type / serialized market type to include `county: string | null` and `city: string | null`
        - Update the Market type in `CustomerHomeUI.tsx` and `MarketCard.tsx` to include county/city
      </steps>
      <test_steps>
        1. Markets data includes county and city fields (null initially)
        2. Markets still render correctly on home page with null county/city
        3. When county/city are populated later, markets sort correctly
      </test_steps>
      <review></review>
    </task>

    <task id="compact-market-row" priority="1" category="functional">
      <title>Build CompactMarketRow component with inline expand inside list card container</title>
      <description>
        New component for the "All Markets" section. Uses a "list card" pattern — NOT flat data-table rows. Each county group is wrapped in a rounded card container (same surface/shadow/radius as MarketCard) with compact rows inside separated by subtle inner dividers. This maintains the premium card-based design language.

        Individual rows are ~64px collapsed, expanding inline on tap to reveal Order Fish button, directions, and catch preview. The expanded content uses the same styling as MarketCard interiors.

        Older adult / outdoor considerations: min 52px touch target on favorite star, 18px font for market names (readable in sunlight), high contrast text, clear expand/collapse visual feedback via chevron icon, no small icons without text labels.

        Persona: Mobile-first React UI engineer — inline expand animation, list card pattern, large touch targets, design tokens, accessibility.
      </description>
      <steps>
        - Create `src/app/pages/home/components/CompactMarketRow.tsx` as "use client" component
        - Props: market (with county/city), isFavorite, onToggleFavorite, vendorSlug, isLast (for hiding bottom divider on last row)
        - Collapsed state (~64px): flex row with:
          - Market name (left, font-size var(--font-size-lg) / 18px, font-weight semibold)
          - Schedule (right of name, color action-primary, font-size var(--font-size-md) / 16px, font-weight semibold)
          - Favorite star (far right, 52px touch target area, padding for easy tapping)
          - Subtle chevron indicator (▸ collapsed, ▾ expanded) next to name to signal expandability
        - Inner divider between rows: `border-bottom: 1px solid var(--color-border-subtle)` — skip on last row (isLast prop)
        - `useState` for expanded boolean, toggled by tapping row (except star). Use `stopPropagation` on star to prevent expand toggle.
        - Expanded state: slides open below the row with padding matching MarketCard interior:
          - Order Fish button (full-width, gradient-primary background, link to `/orders/new?market=${id}&b=${vendorSlug}`, same btn styling as MarketCard)
          - Directions link (📍 icon + "Directions" text label — not icon-only)
          - Catch preview if available ("Usually available: Grouper, Shrimp")
        - Expand animation: CSS `max-height` transition from 0 to 200px with `overflow: hidden` and `transition: max-height 0.3s ease`. Wrap in `@media (prefers-reduced-motion: reduce)` to use instant transitions.
        - Star styling: filled star (gold / var(--color-accent-gold)) when favorite, outline star when not. Font-size xl for visibility. `aria-label` for accessibility.
        - Add to barrel export in `src/app/pages/home/components/index.ts`
        - NOTE: This component renders INSIDE a card container (provided by the parent layout). It does NOT render its own card wrapper — just the row + expand content.
      </steps>
      <test_steps>
        1. Compact row shows market name (18px) + schedule + star in ~64px height
        2. Chevron indicates expandability
        3. Tap row — expands smoothly to show Order Fish, directions, catch preview
        4. Tap expanded row header — collapses smoothly
        5. Tap star — toggles favorite without expanding/collapsing
        6. Star touch target is at least 52px
        7. Text is readable in sunlight (18px names, high contrast)
        8. Multiple rows expand independently
        9. Order Fish links to correct URL with market ID and vendor slug
        10. Inner dividers visible between rows, no divider on last row
        11. Expanded content styling matches MarketCard interior feel
        12. With prefers-reduced-motion: expand/collapse is instant
      </test_steps>
      <review></review>
    </task>

    <task id="market-card-refresh" priority="1" category="style">
      <title>Refresh MarketCard design for favorites section</title>
      <description>
        Light design refresh of the existing MarketCard used in the "Your Markets" favorites section. Slightly more compact, visually distinct from the list card compact rows below. Keep all existing functionality.

        Outdoor readability: bump market name to var(--font-size-xl) (20px), schedule to var(--font-size-lg) (18px). These are the hero cards — they should feel prominent and easy to scan in sunlight.

        Persona: Mobile-first React UI engineer — design refinement, visual hierarchy, design tokens, outdoor readability.
      </description>
      <steps>
        - In `src/app/pages/home/components/MarketCard.tsx`:
          - Reduce padding from `var(--space-lg)` to `var(--space-md)` for slightly more compact feel
          - Bump market name font size to var(--font-size-xl) (20px) for outdoor readability
          - Bump schedule font size to var(--font-size-lg) (18px)
          - Add county/city display below schedule if available: font-size var(--font-size-md), color text-secondary, showing "DeSoto County" or "Oxford, Lafayette Co."
          - Ensure visual distinction from list card compact rows: card has individual elevation (`var(--shadow-md)`), border-radius var(--radius-lg), its own background surface treatment. Compact rows live inside shared card containers — MarketCards are standalone.
          - Keep all existing functionality: favorite toggle, Order Fish/Manage Market button, catch preview, directions
        - Update Market type to include county/city (coordinate with fetch-vendor-data-update task)
      </steps>
      <test_steps>
        1. Favorited markets display as standalone cards (not inside list card containers)
        2. Market name is 20px, schedule is 18px — readable in sunlight
        3. Cards show county/city when available
        4. Cards are visually distinct from list card rows (standalone elevation, rounded corners)
        5. All existing buttons and interactions still work
        6. Cards are slightly more compact than before (less padding, but larger text)
      </test_steps>
      <review></review>
    </task>

    <task id="hybrid-market-layout" priority="1" category="functional">
      <title>Refactor CustomerHomeUI to hybrid layout with list card county groups</title>
      <description>
        The main layout change. "Your Markets" section keeps MarketCards for favorites. "All Markets" section switches from MarketCards to CompactMarketRows grouped by county inside list card containers.

        Each county group is wrapped in a card container (background: var(--color-surface-primary), borderRadius: var(--radius-lg), boxShadow: var(--shadow-md), border: 1px solid var(--color-border-subtle)). County header sits above or inside the card. CompactMarketRows render inside, separated by inner dividers. This maintains the card-based design language — no flat data tables.

        When county data is null (before Evan populates), all markets appear in a single card with no county header — clean, no "Other" label cluttering the UI.

        When 0 favorites: hide "Your Markets" section entirely (don't show empty state). Just show "All Markets" with the list cards.

        Persona: Mobile-first React UI engineer — layout composition, list card pattern, data grouping, section headers, progressive enhancement.
      </description>
      <steps>
        - In `src/app/pages/home/CustomerHomeUI.tsx`:
          - Update Market type to include `county: string | null` and `city: string | null`
          - Keep YourMarketsSection: render only when `favoriteMarkets.length > 0` (already the case). Uses refreshed MarketCards.
          - Rewrite AllMarketsSection to use county-grouped list cards:
            - Add `groupByCounty` helper: takes Market[], returns Map<string, Market[]>. Null county → single group with no header label (not "Other").
            - Each county group renders as:
              1. County header ABOVE the card: font-size var(--font-size-xl) (20px), font-weight bold, color text-primary, margin-bottom var(--space-sm)
              2. Card container: surface-primary bg, radius-lg, shadow-md, border-subtle. Overflow hidden.
              3. Inside card: CompactMarketRows with isLast prop on final row
            - When only one group (all null county): skip the header, just render the card container
          - Import CompactMarketRow from ./components
        - Section title: "All Markets" in heading-2xl (drop count — county headers provide structure)
        - Spacing between county groups: var(--space-lg) gap
      </steps>
      <test_steps>
        1. Favorited markets appear as MarketCards in "Your Markets" section
        2. 0 favorites — "Your Markets" section hidden, no empty state
        3. All markets appear as compact rows inside rounded card containers
        4. With county data: each county has header label + card container with rows
        5. Without county data: single card container, no header label
        6. Card containers have same visual treatment as MarketCard (shadow, radius, surface)
        7. Star a compact row → it appears in "Your Markets" as a card
        8. Unstar a card → it disappears from "Your Markets", remains as compact row
        9. Total page height significantly reduced vs. current all-cards layout
        10. Popup markets section still renders correctly (unchanged)
        11. Catch data / FreshHero still renders correctly (unchanged)
        12. County group cards feel like they belong in the existing design — not a data table
      </test_steps>
      <review></review>
    </task>

    <task id="market-a11y" priority="1" category="functional">
      <title>Accessibility hardening for market browser components</title>
      <description>
        Ensure CompactMarketRow, refreshed MarketCard, and county-grouped layout ship with proper accessibility. Fix existing gaps in MarketCard (emoji buttons without ARIA) while adding new patterns.

        Persona: Mobile-first React UI engineer — WCAG AA, ARIA expanded/collapsed, keyboard navigation, reduced motion, focus states.
      </description>
      <steps>
        - Focus states: add visible `:focus-visible` indicator (outline or background highlight) on CompactMarketRow (entire row is focusable), favorite star, Order Fish button, directions link
        - CompactMarketRow ARIA: row is a `<button>` (not div with onClick) wrapping the collapsed content, with `aria-expanded="true/false"`. Star is a separate nested `<button>` with `aria-label`.
        - Keyboard: Enter/Space on compact row toggles expand. Enter/Space on star toggles favorite. Tab order: row → star → (when expanded) Order Fish → directions.
        - `prefers-reduced-motion`: wrap expand animation (`max-height` transition) in media query. Use instant open/close when reduced motion preferred.
        - Fix existing MarketCard ARIA gaps:
          - Settings button (⚙️): add `aria-label="Edit market settings"`
          - Directions button (📍): add `aria-label="Get directions"`
          - Favorite star: already has aria-label (keep)
          - Wrap emoji icons in `<span role="img" aria-hidden="true">` when paired with text labels
        - County group headers: use `<h3>` semantic heading for county names (within the "All Markets" `<h2>` section hierarchy)
      </steps>
      <test_steps>
        1. Tab through compact rows — visible focus indicator on each row and star
        2. Press Enter on compact row — expands, aria-expanded updates
        3. Press Enter on star — toggles favorite, screen reader announces state change
        4. Tab into expanded content — Order Fish and directions are focusable
        5. Screen reader announces county group headers
        6. With prefers-reduced-motion: expand/collapse is instant
        7. Existing MarketCard emoji buttons now have screen reader labels
        8. Full keyboard-only flow: navigate markets, expand, order fish — no mouse needed
      </test_steps>
      <review></review>
    </task>

  </tasks>

  <success_criteria>
    - 8 markets fit on screen without excessive scrolling (list cards ~500px vs current ~1600px)
    - Favorited markets highlighted as cards at top; 0 favorites = section hidden
    - Non-favorite markets scannable as compact rows inside card containers grouped by county
    - List card containers match existing design language (same surface, shadow, radius as MarketCard)
    - Tap to expand compact row reveals Order Fish + details with card-interior styling
    - County grouping works with null data (single card, no header)
    - Outdoor readability: 18px market names, 52px+ tap targets, high contrast in light mode
    - All interactive elements have visible focus states
    - Keyboard-only users can navigate, expand, and order
    - prefers-reduced-motion disables expand/collapse animations
    - No regression to existing functionality (popups, catch data, favorites, ordering)
  </success_criteria>

  <deferred>
    - Map view of markets
    - Market detail page (dedicated route per market)
    - Search/filter by market name
    - Distance-based sorting (requires geolocation)
    - Market hours / open-now indicator
    - Favorites sync to database (currently localStorage only)
    - Force light mode in Capacitor for outdoor usage
  </deferred>

</project_specification>
