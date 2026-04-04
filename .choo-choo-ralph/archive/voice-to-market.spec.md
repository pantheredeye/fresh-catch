---
title: "Voice-to-Market with Command Bar"
created: 2026-03-27
poured:
  - fresh-catch-mol-tulb
  - fresh-catch-mol-60kp
  - fresh-catch-mol-cr4k
  - fresh-catch-mol-yw18
  - fresh-catch-mol-f1u6
  - fresh-catch-mol-qn5v
  - fresh-catch-mol-g284
  - fresh-catch-mol-briq
  - fresh-catch-mol-7l4w
  - fresh-catch-mol-1k5i
  - fresh-catch-mol-qns3
  - fresh-catch-mol-cpsz
  - fresh-catch-mol-05vv
  - fresh-catch-mol-k49g
  - fresh-catch-mol-5ou3
  - fresh-catch-mol-pvqu
  - fresh-catch-mol-52m9
  - fresh-catch-mol-59cb
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Voice-to-Market with Command Bar</project_name>

  <overview>
    Universal voice command bar (FAB mic on admin pages) with intent-aware routing,
    popup market type with expiration and catch preview, and past-popups archive.

    The command bar subsumes dedicated voice pages — one mic, many actions. Evan taps
    from anywhere, speaks, the system classifies intent, shows the right review form.

    Architecture: shared voice recording infra (extracted from CatchUI) + voice tool
    registry (generates LLM prompt now, becomes Agents SDK tools in Phase 3) + shared
    Whisper→Llama pipeline + polymorphic review component.

    Goals:
    - One mic button accessible from any admin page handles all voice actions
    - Popup markets with expiration (end-of-day), catch preview, archive
    - Voice updates to existing markets (partial diff)
    - Shared infrastructure reused across catch + markets + future features
    - Tool registry designed for future Agents SDK migration (Phase 3, not a dependency)
    - Command bar will extend to customers eventually (role-based tool filtering)
  </overview>

  <context>
    <existing_patterns>
      - Voice-to-catch pipeline: CatchUI.tsx state machine (idle→recording→processing→review→publishing→done), catch-record.ts API endpoint (Whisper → Llama → JSON parse), catch-functions.ts server functions (publishCatch, clearCatch)
      - Audio capture: MediaRecorder with webm/mp4 MIME detection, AudioContext+AnalyserNode for amplitude viz, 120s auto-stop, blob retention on error for retry
      - Text fallback: POST JSON {text} to same endpoint, Content-Type detection branches in catch-record.ts:34
      - Market CRUD: market-functions.ts with FIELD_LIMITS validation, createMarket/updateMarket/deleteMarket/toggleMarketActive
      - Server component pattern: auth check sequence (!ctx.user → !hasAdminAccess → !ctx.currentOrganization), fetch in server, pass to client
      - Client component pattern: useTransition() for server function calls, modal state management
      - API endpoint registration: middleware handler in worker.tsx after session/user middleware (lines 158-164)
      - Review-before-publish: CatchUI review state allows editing headline, items, summary before calling publishCatch()
      - Admin layout: AdminLayout wraps all admin routes, good place to mount FAB
    </existing_patterns>
    <integration_points>
      - prisma/schema.prisma: extend Market model with type, expiresAt, catchPreview, notes, rawTranscript, cancelledAt
      - src/app/pages/admin/catch/CatchUI.tsx: refactor to use shared useVoiceRecorder hook + VoiceMicButton
      - src/app/pages/admin/market-functions.ts: extend for popup lifecycle + new fields
      - src/worker.tsx: register /api/voice/command endpoint (after session middleware)
      - src/layouts/AdminLayout.tsx (or equivalent): mount CommandBarFAB
      - src/app/pages/admin/MarketConfigUI.tsx: popup sections, cancel/end actions
      - src/app/pages/home/CustomerHome.tsx: fetch active popups, expiration filter
      - src/app/pages/home/CustomerHomeUI.tsx: popup cards with urgency treatment
      - src/app/pages/home/components/: PopupCard component
    </integration_points>
    <new_technologies>
      - No new dependencies. Same Whisper (@cf/openai/whisper-tiny-en) + Llama (@cf/meta/llama-3.3-70b-instruct-fp8-fast) pipeline
      - Tool registry pattern: defines actions as { description, schema, handler, reviewComponent } — generates system prompt for Phase 1, becomes Agents SDK tool definitions for Phase 3
      - Date inference: LLM resolves relative dates with current date in prompt, but date picker in review is source of truth
      - Phase 3 path: Cloudflare Agents SDK (agents npm package) — AIChatAgent class on Durable Objects, useAgentChat React hook, persistent conversation, native tool calling. Same tool registry, different runtime.
    </new_technologies>
    <conventions>
      - Server functions: "use server" + requestInfo for context + hasAdminAccess guard
      - Inline styles with design tokens (var(--color-*, --space-*, --radius-*))
      - Page components: FeaturePage.tsx (server) + FeatureUI.tsx (client) + functions.ts
      - CSS: page-level CSS file for feature-specific styles
      - State machine: explicit string union type for UI states
      - FIELD_LIMITS object for validation, validateFields() helper
      - Conditional spreads for partial updates: ...(data.field !== undefined && { field })
      - Mobile-first: large tap targets, 140px mic button, dock-friendly
      - Component placement: shared components in design-system if 3+ pages, page-specific in page/components/
    </conventions>
  </context>

  <tasks>
    <task id="schema" priority="0" category="infrastructure">
      <title>Extend Market schema with popup and voice fields</title>
      <description>
        Add popup type, expiration, catch preview, voice transcript, and cancellation
        tracking to Market model. All new fields optional/defaulted for backward compat.
      </description>
      <steps>
        - Add to Market model in prisma/schema.prisma:
          type           String    @default("regular")  // "regular" | "popup"
          expiresAt      DateTime?                       // end of event day for popups
          catchPreview   String?                         // JSON: { items: [{name, note}] }
          notes          String?                         // catch-all for unstructured voice content
          rawTranscript  String?                         // verbatim Whisper output (null for form-created)
          cancelledAt    DateTime?                       // set if popup cancelled before happening
        - Add index: @@index([organizationId, type, active])
        - Create migration: pnpm run migrate:new (name: add-popup-market-fields)
        - Apply locally: pnpm run migrate:dev
        - Regenerate types: pnpm run generate
      </steps>
      <test_steps>
        1. pnpm run migrate:dev — no errors
        2. pnpm run generate — Prisma client regenerated
        3. pnpm run types — no type errors
        4. Existing market CRUD still works (all new fields optional/defaulted)
      </test_steps>
      <review></review>
    </task>

    <task id="shared-voice-infra" priority="0" category="infrastructure">
      <title>Extract shared voice recording infrastructure from CatchUI</title>
      <description>
        Extract reusable voice recording hook and mic button component from CatchUI.
        Refactor CatchUI to use them. This proves the abstraction and unblocks
        command bar + all future voice features.
      </description>
      <steps>
        - Create src/hooks/useVoiceRecorder.ts:
          - Encapsulates: MediaRecorder lifecycle, AudioContext + AnalyserNode, amplitude state,
            timer (configurable duration, default 120s), blob management + retention on error,
            MIME type detection (webm/mp4), cleanup
          - Returns: { state, amplitude, timeLeft, startRecording, stopRecording, retryUpload, blob }
          - State type: "idle" | "recording" | "processing" | "done" | "error" | "permission-denied"
          - Accepts: onAudioReady(blob) callback for upload handling
        - Create src/components/VoiceMicButton.tsx + voice-mic.css:
          - 140px circular mic button with amplitude-reactive glow
          - Timer display, state-based styling (idle=blue, recording=red, processing=spinner)
          - Pulsing ring animation during recording
          - Reuses catch.css patterns, uses design tokens
        - Create src/api/voice-pipeline.ts:
          - Shared server-side: auth checks, Whisper transcription, LLM formatting, robust JSON parse
          - Function: processVoiceInput(request, ctx, { systemPrompt, validate })
          - Handles Content-Type branching (audio vs JSON text)
          - Returns: { formatted, rawTranscript }
        - Refactor CatchUI to use useVoiceRecorder + VoiceMicButton:
          - Remove duplicated MediaRecorder/AudioContext/timer code
          - CatchUI keeps: review form, publish logic, catch-specific state
          - Verify identical behavior after refactor
        - Refactor catch-record.ts to use voice-pipeline.ts:
          - Becomes thin wrapper: provides catch-specific system prompt + validateCatchContent
      </steps>
      <test_steps>
        1. CatchUI works identically after refactor — record, review, publish
        2. Voice recording on iOS Safari (mp4 fallback) still works
        3. Voice recording on Chrome (webm) still works
        4. Amplitude visualization responsive during recording
        5. 120s auto-stop triggers correctly
        6. Blob retained on upload error, retry works without re-recording
        7. Text mode still works (CatchUI type toggle)
        8. No regressions in existing catch flow
      </test_steps>
      <review></review>
    </task>

    <task id="tool-registry" priority="1" category="functional">
      <title>Voice tool registry and intent-aware API endpoint</title>
      <description>
        Define all voice actions as a tool registry. Build intent-aware endpoint
        POST /api/voice/command that injects business context (markets, current catch)
        into the LLM prompt, classifies intent, and extracts fields per the matched tool's schema.

        The registry generates the system prompt now (Phase 1). Same registry shape
        becomes Agents SDK tool definitions later (Phase 3).
      </description>
      <steps>
        - Create src/api/voice-tools.ts — the tool registry:
          export const voiceTools = {
            update_catch: {
              description: "Update today's fresh catch with what's available",
              schema: { headline, items[], summary },
              reviewType: "catch",
            },
            create_market: {
              description: "Add a new recurring market",
              schema: { name, schedule, locationDetails?, customerInfo?, catchPreview? },
              reviewType: "market-create",
            },
            create_popup: {
              description: "Create a temporary popup market event",
              schema: { name, schedule, expiresAt, locationDetails?, customerInfo?, catchPreview? },
              reviewType: "popup-create",
            },
            update_market: {
              description: "Update details on an existing market (name match)",
              schema: { marketId, ...partial fields },
              reviewType: "market-update",
            },
            update_market_catch: {
              description: "Update what's available at a specific market",
              schema: { marketId, catchPreview },
              reviewType: "market-catch",
            },
          }
        - Create function buildCommandPrompt(tools, businessContext):
          - Generates system prompt from registry descriptions + schemas
          - Injects current date for relative date resolution
          - Injects business context: list of existing markets (name, id, type, schedule, active)
          - Instructs LLM to return: { intent, confidence, data, interpretation }
          - "interpretation" is a human-readable summary ("Update catch preview for Folly Beach")
        - Create src/api/voice-command.ts — handleVoiceCommand(request, ctx):
          - Uses voice-pipeline.ts for Whisper + LLM
          - Fetches business context from DB (org's markets, current catch status)
          - Builds prompt via buildCommandPrompt()
          - Validates response shape: intent must be a known tool key
          - If intent is update_market or update_market_catch:
            check for marketId query param OR fuzzy name match from LLM
          - Returns: { intent, confidence, data, interpretation, rawTranscript }
        - Register in worker.tsx: POST /api/voice/command (after session middleware)
        - Role-based tool filtering: check user role, filter tools accordingly
          (admin sees all, future: customer sees customer tools)
      </steps>
      <test_steps>
        1. POST audio "got mahi and grouper today" → intent: update_catch
        2. POST audio "doing popup at Shem Creek Thursday 4-7" → intent: create_popup, expiresAt populated
        3. POST audio "heading to Folly Beach, got shrimp and mahi" → intent: update_market_catch, marketId matched
        4. POST audio "add me to the Saturday market downtown" → intent: create_market
        5. POST audio "Folly Beach moved to Sundays" → intent: update_market, only schedule changed
        6. POST text fallback for all above intents
        7. Unknown/ambiguous input → low confidence, interpretation explains uncertainty
        8. Auth: 401/403 for unauthorized users
        9. Business context: markets list correctly injected into prompt
      </test_steps>
      <review></review>
    </task>

    <task id="market-functions" priority="1" category="functional">
      <title>Extend market server functions for popup lifecycle</title>
      <description>
        Update market-functions.ts for new fields, popup-specific actions,
        and catch preview support for both market types.
      </description>
      <steps>
        - Update FIELD_LIMITS: add catchPreview (2000), notes (1000), rawTranscript (5000)
        - Update createMarket(): accept type, expiresAt, catchPreview, notes, rawTranscript
        - Update updateMarket(): accept same new fields with conditional spreads
        - Add cancelPopup(id):
          - Sets cancelledAt to now, active to false
          - Keeps record for admin history but hidden from customer archive
        - Add endPopup(id):
          - Sets active to false (popup happened but ended early)
          - cancelledAt stays null (it wasn't cancelled, it happened)
        - Update validateMarketFields() for new field limits
        - Add updateMarketCatchPreview(id, catchPreview, rawTranscript):
          - Updates just the catch preview fields on an existing market
          - Used by update_market_catch intent
        - Helper: isPopupExpired(market) = market.type === "popup" && market.expiresAt && market.expiresAt < now
        - Helper: isPopupCancelled(market) = market.cancelledAt !== null
      </steps>
      <test_steps>
        1. Create popup with all new fields → saved correctly
        2. Create regular market → type="regular", expiresAt/cancelledAt null
        3. cancelPopup → cancelledAt set, active=false
        4. endPopup → active=false, cancelledAt stays null
        5. updateMarketCatchPreview → only catchPreview + rawTranscript updated
        6. Field validation: rejects oversized fields
        7. catchPreview works on both regular and popup markets
      </test_steps>
      <review></review>
    </task>

    <task id="command-bar" priority="1" category="functional">
      <title>Command bar FAB on admin layout</title>
      <description>
        Floating action button (mic icon) mounted in AdminLayout, accessible from every
        admin page. Tapping opens a half-sheet with recording UI using shared
        useVoiceRecorder + VoiceMicButton. Posts to /api/voice/command.
        After processing, hands off to polymorphic review.
      </description>
      <steps>
        - Create src/components/CommandBar.tsx ("use client"):
          - FAB: fixed position bottom-right, 56px circle, mic icon, z-index above content
          - Tap → half-sheet slides up from bottom (CSS transition)
          - Half-sheet contains:
            - VoiceMicButton (shared component)
            - Hint chips: contextual based on current page (catch page → "what's fresh today",
              markets page → "add market, create popup, update details")
            - Input mode toggle: Voice | Type
            - Text textarea fallback
          - On audio/text ready: POST to /api/voice/command
          - On response: pass { intent, data, interpretation, rawTranscript } to onResult callback
          - Escape / swipe down / tap outside closes half-sheet
        - Create src/components/command-bar.css:
          - FAB styling with shadow, hover lift
          - Half-sheet: max-height 70vh, border-radius top corners, backdrop blur
          - Slide-up animation
          - Mobile: full-width half-sheet, FAB 16px from edge
        - Mount CommandBar in AdminLayout (or admin route wrapper)
        - CommandBar accepts onResult prop — parent handles review rendering
        - Contextual hints: CommandBar accepts optional hintContext prop
          (e.g., current page name, so hints adapt)
      </steps>
      <test_steps>
        1. FAB visible on all admin pages (dashboard, config, catch, orders, team)
        2. Tap FAB → half-sheet slides up smoothly
        3. Record audio → processing state → response received
        4. Text mode works
        5. Escape closes half-sheet
        6. Tap outside closes half-sheet
        7. FAB doesn't obscure important content (positioned clear of bottom nav)
        8. Mobile: full-width, thumb-reachable
        9. Half-sheet doesn't interfere with page scrolling when closed
      </test_steps>
      <review></review>
    </task>

    <task id="polymorphic-review" priority="1" category="functional">
      <title>Polymorphic review component for command bar results</title>
      <description>
        Review component that adapts its form based on the intent returned by the
        voice command endpoint. Each intent has a dedicated review form. User edits
        and confirms before the action executes.
      </description>
      <steps>
        - Create src/components/CommandReview.tsx ("use client"):
          - Props: { intent, data, interpretation, rawTranscript, onSave, onCancel, onRetry }
          - Renders interpretation as header: "Updating catch preview for Folly Beach Market"
          - Switches on intent to render appropriate form:
            - update_catch: headline, items list (add/remove), summary (reuse CatchUI review pattern)
            - create_market: name, schedule, locationDetails, customerInfo, catchPreview items, active toggle
            - create_popup: name, schedule, expiresAt (DATE PICKER prominent), locationDetails,
              customerInfo, catchPreview items, notes
            - update_market: diff view — changed fields highlighted, unchanged dimmed,
              old→new values shown
            - update_market_catch: market name (read-only), catchPreview items (editable)
          - Confidence indicator: if confidence < 0.7, show warning:
            "I'm not sure about this. Did you mean: [intent]?"
            with "That's not right" button → re-record or manual intent selection
          - Date picker for expiresAt: prominent, pre-populated with LLM guess, user confirms
          - Save button → calls appropriate server function based on intent:
            update_catch → publishCatch()
            create_market/create_popup → createMarket()
            update_market → updateMarket()
            update_market_catch → updateMarketCatchPreview()
          - Save includes rawTranscript for voice-created records
        - Create src/components/command-review.css
        - Review renders as full-screen overlay (half-sheet transitions to full for review space)
        - Wire into admin page flow:
          CommandBar onResult → show CommandReview → onSave → close + navigate/refresh
      </steps>
      <test_steps>
        1. update_catch intent → shows headline + items + summary editor
        2. create_popup intent → shows all popup fields with prominent date picker
        3. create_market intent → shows market creation form
        4. update_market intent → shows diff with changed fields highlighted
        5. update_market_catch intent → shows market name + editable catch items
        6. Low confidence → warning shown with "That's not right" option
        7. Edit any field → changes reflected in save payload
        8. Save → correct server function called, success feedback shown
        9. Cancel → returns to half-sheet or closes
        10. Retry → re-record with blob retained
      </test_steps>
      <review></review>
    </task>

    <task id="voice-updates" priority="2" category="functional">
      <title>Voice-driven market updates with context</title>
      <description>
        When the voice command targets an existing market, the API includes that market's
        current state in the LLM prompt so it returns only changed fields. Review shows
        a clean diff.
      </description>
      <steps>
        - In voice-command.ts: when intent is update_market or update_market_catch:
          - If marketId in response data, fetch full market from DB
          - Re-prompt LLM with market context:
            "Current market: {name}, {schedule}, {type}, active={active}, catchPreview={...}.
             The user said: '{transcript}'. Return ONLY changed fields."
          - OR: do this in one pass by including all markets in initial prompt (small list)
        - In polymorphic review: diff display for update intents
          - Changed fields: highlighted with old→new values
          - Unchanged fields: shown dimmed below
          - User can toggle unchanged fields to edit them too
        - Date picker: for popup expiresAt changes, always show picker even if LLM didn't change it
        - Market name matching: LLM returns marketId from the injected market list.
          If fuzzy match confidence low, show "Did you mean [market name]?" selector
        - Save: calls updateMarket() with only changed fields (conditional spreads)
      </steps>
      <test_steps>
        1. "Folly Beach moved to Sundays" → only schedule changed in diff
        2. "Market's paused until April" → active=false, subtitle="Paused until April" shown
        3. "Got mahi and shrimp for Folly Beach" → only catchPreview changed
        4. Ambiguous market name → disambiguation shown
        5. Edit unchanged field in review → included in save
        6. Date picker visible and editable for popup updates
      </test_steps>
      <review></review>
    </task>

    <task id="admin-popup-ui" priority="2" category="functional">
      <title>Admin popup management in MarketConfigUI</title>
      <description>
        Update MarketConfigUI to display popups separately from regular markets,
        with cancel/end actions, visual distinction, and expiration status.
      </description>
      <steps>
        - MarketConfigUI: three sections (replacing two):
          1. Active Popups (top, if any exist) — with countdown/date badge, catch preview summary
          2. Active Regular Markets — existing display
          3. Inactive/Expired (collapsed by default) — both types
        - Popup card in admin shows: name, date, time, location, catch preview summary, expiration status
        - Actions on active popup: "End Now" (calls endPopup), "Cancel" (calls cancelPopup), "Edit"
        - Expired popups: "Expired" badge, grayed out
        - Cancelled popups: "Cancelled" badge, distinct from expired
        - "Add Market" becomes two options: "Add Market" (form) | "Add Popup" (form)
          - Voice creation is via the command bar FAB (always accessible)
        - MarketFormModal: extend for popup fields (type toggle, expiresAt picker, catchPreview editor)
      </steps>
      <test_steps>
        1. Three sections render correctly when all types present
        2. Active popup shows date badge and catch preview
        3. "End Now" → popup moves to inactive, cancelledAt stays null
        4. "Cancel" → popup moves to inactive, cancelledAt set
        5. Expired popup auto-appears in inactive section
        6. Cancelled vs expired visually distinct in inactive section
        7. Empty sections hidden gracefully
        8. Add Market / Add Popup forms work with new fields
      </test_steps>
      <review></review>
    </task>

    <task id="customer-popups" priority="2" category="functional">
      <title>Customer-facing popup cards with urgency treatment</title>
      <description>
        Show active popups on customer home with distinct urgent styling.
        Catch preview displayed inline. Both market types support catch preview.
      </description>
      <steps>
        - CustomerHome.tsx: fetch popups separately
          where: { organizationId, type: "popup", active: true, cancelledAt: null }
          Filter in code: expiresAt is null OR expiresAt > now (start of today)
        - Create src/app/pages/home/components/PopupCard.tsx:
          - Coral/warm gradient (var(--color-gradient-secondary))
          - Badge: "TODAY!" / "TOMORROW!" / formatted date
          - Market name, time, location
          - Catch preview items inline (frosted glass like FreshSheet)
          - "Order Now" CTA → /orders/new
        - CustomerHomeUI: render popup section above regular markets
          - Section header: "Coming Up" or "Popup Events"
          - Only shown if active non-expired non-cancelled popups exist
        - Regular MarketCard: also show catchPreview if populated
          - Smaller/subtler than popup treatment
          - "Usually available: Mahi, Grouper, Shrimp"
        - Multiple popups on same day: stack as separate cards
        - Export PopupCard from home/components/index.ts
      </steps>
      <test_steps>
        1. Today's popup → "TODAY!" badge, coral gradient
        2. Tomorrow's popup → "TOMORROW!" badge
        3. Future popup → formatted date badge
        4. Expired popup not shown
        5. Cancelled popup not shown
        6. Catch preview items displayed on popup card
        7. Regular market with catchPreview shows "Usually available" line
        8. Two popups same day → two cards stacked
        9. No popup section when none active
        10. "Order Now" → /orders/new
      </test_steps>
      <review></review>
    </task>

    <task id="archive-page" priority="3" category="functional">
      <title>Past popups archive at /markets/past</title>
      <description>
        Dedicated page showing completed popup history. Cancelled popups hidden
        from customers (shown in admin). Acts as portfolio of Evan's popup activity.
      </description>
      <steps>
        - Create src/app/pages/markets/ directory:
          - PastPopupsPage.tsx (server component): auth check (public, uses org context)
            Fetch: where: { organizationId, type: "popup",
              AND: [{ cancelledAt: null }, OR: [{ active: false }, { expiresAt: { lt: now } }]] }
            orderBy: { createdAt: "desc" }
          - PastPopupsUI.tsx (client component): render feed
        - Each archive card: name, date, location, catch preview (what was available)
        - Simple reverse chronological list (group by month if >10 popups)
        - Read-only, no edit actions
        - Empty state: "No past popups yet" with subtle illustration
        - Add route in customer routes: /markets/past
        - Register in worker.tsx under CustomerLayout
        - Link from customer home: small "See past popups →" text link below popup section
        - Link from BottomNavigation (if markets section added later)
      </steps>
      <test_steps>
        1. /markets/past shows expired popups newest first
        2. Each card: name, date, location, catch preview
        3. Cancelled popups NOT shown (cancelledAt filters them)
        4. No edit/delete actions visible
        5. Empty state when no past popups
        6. Link from customer home navigates correctly
        7. Uses CustomerLayout (header, footer, nav)
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Command bar FAB accessible from every admin page
    - Evan can speak a command and the system routes to the right action
    - All existing catch voice functionality preserved (refactored, not broken)
    - Popup markets: create, end, cancel, expire, archive
    - Catch preview on both regular and popup markets
    - Customer home shows active popups with urgency styling
    - Past popups browsable at /markets/past (cancelled excluded)
    - Voice updates show clean diff of changed fields
    - Date picker prominent for all date fields (LLM guess is editable)
    - Low-confidence intents surface warning before committing
    - Tool registry pattern ready for Agents SDK migration (Phase 3)
    - Mobile-first: all interactions dock-friendly on wet phone
    - Half-sheet recording UI, full-screen review
  </success_criteria>

</project_specification>
