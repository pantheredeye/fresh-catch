---
title: "Voice-to-Catch: Voice Inventory Updates"
created: 2026-03-22
poured: []
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Voice-to-Catch: Voice Inventory Updates</project_name>

  <overview>
    Admin (Evan, a fisherman) presses a big mic button, speaks about available fish,
    and the app transcribes (Cloudflare Whisper) → formats (Claude API) → saves to DB.
    Customers see a formatted "This Week's Catch" text display on the home page.

    Audio is input-only — customers never hear audio, only see formatted text.
    Voice-first UX: big tap target for wet hands on docks, tap-to-start/tap-to-stop,
    auto-submit on stop, auto-stop + auto-submit at 2-minute cap.
    Full replace on re-record (old catch archived).

    Customer hero section: FreshSheet replaces FreshHero when catch data exists AND
    is less than 7 days old. Stale catch (>7d) falls back to FreshHero.
    Quick actions already live in BottomNav, so hero can be 100% catch-focused.
    Tone: structured list with Evan's colorful descriptions preserved.

    Follow-up (not in this spec): Add "My Orders" to BottomNav More menu,
    since removing hero quick actions loses that access point.
  </overview>

  <context>
    <existing_patterns>
      - Server functions: "use server" at top, `requestInfo` for ctx, `hasAdminAccess(ctx)` guard first, return `{ success, error? }` shape, org-scoped queries always filter by `organizationId`
      - Server→Client wiring: ServerPage.tsx does auth check + db fetch → passes data to ClientUI.tsx ("use client")
      - CSS: page-level .css files, BEM-like naming (`.catch-mic__ring--recording`), semantic tokens only (`var(--color-action-primary)`), `@media (max-width: 640px)` for mobile
      - Routes: exported as const array from feature's routes.ts, imported in worker.tsx under prefix
      - Client state: `useState` per state slice, `useTransition` for server function calls, `startTransition(async () => { ... })`
      - API endpoints (non-server-function): raw handler functions returning Response objects, env secrets via `(env as unknown as Record<string, string>).SECRET_NAME`
      - Admin nav: card grid in AdminDashboardUI with emoji icon + title + description, links to feature pages
      - Component barrel exports: `components/index.ts` with variant system (`export { V2 as Component }`)
      - Design system primitives: Button, Card, Badge, Container from `@/design-system`
    </existing_patterns>

    <integration_points>
      - `src/app/pages/admin/routes.ts` — add `/catch` route
      - `src/app/pages/admin/AdminDashboardUI.tsx` — add "Fresh Catch" nav card (4th card)
      - `src/app/pages/home/CustomerHome.tsx` — fetch latest live CatchUpdate, pass to UI
      - `src/app/pages/home/CustomerHomeUI.tsx` — conditional: FreshSheet (catch exists + fresh) vs FreshHero (fallback)
      - `src/app/pages/home/components/index.ts` — export FreshSheet
      - `prisma/schema.prisma` — add CatchUpdate model + Organization relation
      - `wrangler.jsonc` — add AI binding
      - `src/worker.tsx` — add POST /api/catch/record handler AFTER session/user middleware, BEFORE render(). NOT before middleware like stripe webhook — we need auth context.
    </integration_points>

    <new_technologies>
      - **Cloudflare Workers AI (Whisper)**: `env.AI.run("@cf/openai/whisper-tiny-en", { audio: [...new Uint8Array(buf)] })` — returns `{ text, words[], vtt }`. Supports webm, mp4, wav, ogg. Audio passed as number array. Config: `"ai": { "binding": "AI" }` in wrangler.jsonc. Use `whisper-tiny-en` (English-only, faster) not full `whisper`.
      - **Browser MediaRecorder API**: Use `navigator.mediaDevices.getUserMedia({ audio: true })` + `new MediaRecorder(stream, { mimeType })`. Safari needs `audio/mp4`, Chrome/Android use `audio/webm;codecs=opus`. Detect with `MediaRecorder.isTypeSupported()`. Must be triggered by user gesture on iOS. HTTPS required.
      - **Claude API via raw fetch**: POST to `https://api.anthropic.com/v1/messages`. Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`. Body: `{ model, max_tokens, system, messages }`. Response: `data.content[0].text`. Use `claude-haiku-4-5-20241022` — cheapest/fastest, plenty for simple formatting. No SDK needed.
      - **AudioContext + AnalyserNode**: For real-time audio level visualization during recording. Connect MediaStream to AnalyserNode, read frequency data in requestAnimationFrame loop, map to visual amplitude on mic button.
    </new_technologies>

    <conventions>
      - Page-level CSS files imported in client component (e.g., `import "./catch.css"`)
      - Server functions return `{ success: boolean, error?: string, data?: T }`
      - Permission check pattern: `if (!hasAdminAccess(ctx) || !ctx.currentOrganization) throw new Error(...)`
      - Env secrets: `(env as unknown as Record<string, string>).ANTHROPIC_API_KEY`
      - Error states: local `useState<string | null>(null)` for error messages
      - Client components use `useTransition()` for async server function calls
    </conventions>
  </context>

  <tasks>
    <task id="db-model" priority="1" category="infrastructure">
      <title>CatchUpdate Database Model</title>
      <description>
        Add CatchUpdate model to Prisma schema and create migration.
        Model stores: id, organizationId (FK), recordedBy (userId, nullable),
        rawTranscript, formattedContent (JSON string),
        status (live|archived — no 'processing', that's in-flight only),
        createdAt, updatedAt.
        Add relation to Organization model. Index on [organizationId, status].
      </description>
      <steps>
        - Add CatchUpdate model to prisma/schema.prisma with fields:
          - id (UUID), organizationId (FK to Organization), recordedBy (String, nullable)
          - rawTranscript (String), formattedContent (String, JSON)
          - status (String, default "live") — only "live" or "archived"
          - createdAt, updatedAt
        - Add `catchUpdates CatchUpdate[]` relation to Organization model
        - Create migration SQL: migrations/NNNN_add_catch_update.sql
        - Run migrate:dev to apply locally
        - Run generate to update Prisma client
      </steps>
      <test_steps>
        1. Run `pnpm run migrate:dev` — no errors
        2. Run `pnpm run generate` — Prisma client regenerates
        3. Run `pnpm run types` — no type errors from schema changes
      </test_steps>
      <review></review>
    </task>

    <task id="wrangler-config" priority="1" category="infrastructure">
      <title>Wrangler AI Binding Configuration</title>
      <description>
        Add Cloudflare Workers AI binding to wrangler.jsonc.
        Document that ANTHROPIC_API_KEY must be set as a Workers secret.
      </description>
      <steps>
        - Add `"ai": { "binding": "AI" }` to wrangler.jsonc
        - Add comment noting ANTHROPIC_API_KEY secret requirement
      </steps>
      <test_steps>
        1. Verify wrangler.jsonc is valid JSON (no syntax errors)
        2. Run `pnpm run dev` — worker starts without binding errors
      </test_steps>
      <review></review>
    </task>

    <task id="audio-api" priority="1" category="functional">
      <title>Audio Processing API Endpoint</title>
      <description>
        Raw API endpoint that receives audio binary, transcribes via Whisper,
        formats via Claude, and saves to DB. Route: POST /api/catch/record.

        CRITICAL: Register in worker.tsx AFTER session/user middleware but BEFORE
        render(Document, [...]). This gives us full auth context (ctx.user,
        ctx.currentOrganization) while still accessing raw request body.
        NOT before middleware like stripe webhook — that pattern is only for
        endpoints that need raw body for signature verification without auth.

        Pipeline: receive audio binary → Whisper transcription (whisper-tiny-en)
        → Claude formatting (haiku) → archive old live catch → save new CatchUpdate
        as live → return formatted content.

        Claude prompt: system prompt says "Return ONLY valid JSON, no markdown,
        no explanation." Parse with robust extraction that strips markdown code
        fences as fallback. Validate shape: { headline: string, items: [{name, note}],
        summary: string }. If parsing fails, return error with raw transcript.

        Tone: structured list preserving Evan's colorful descriptions.
        Example: { headline: "Fresh Gulf Catch", items: [{ name: "Redfish", note: "beautiful fillets" }], summary: "..." }
      </description>
      <steps>
        - Create src/api/catch-record.ts with handleCatchRecord(request, ctx) function
        - Verify ctx.user and hasAdminAccess(ctx), return 401/403 if not
        - Read request body as ArrayBuffer
        - Call env.AI.run("@cf/openai/whisper-tiny-en", { audio: [...new Uint8Array(body)] })
        - Call Claude API (haiku) via fetch with system prompt enforcing JSON-only output
        - Parse Claude response with robust JSON extraction:
          - Try JSON.parse directly
          - Fallback: strip ```json...``` code fences, try again
          - Validate parsed object has headline (string), items (array), summary (string)
          - If all parsing fails, return error with raw transcript text
        - Archive existing live CatchUpdate for org (status → 'archived')
        - Create new CatchUpdate with status 'live', recordedBy = ctx.user.id
        - Return JSON response with formatted content
        - Register in worker.tsx: add middleware handler AFTER session/user loading,
          BEFORE render(), checking for POST /api/catch/record
      </steps>
      <test_steps>
        1. POST audio file to /api/catch/record with valid admin session
        2. Verify Whisper returns transcript text
        3. Verify Claude returns valid JSON with headline, items, summary
        4. Verify new CatchUpdate created in DB with status 'live' and recordedBy set
        5. Verify previous live CatchUpdate status changed to 'archived'
        6. POST without auth — verify 401 response
        7. POST with non-admin user — verify 403 response
        8. Verify Claude JSON with code fences still parses correctly (fallback extraction)
        9. Verify invalid Claude response returns error with raw transcript
      </test_steps>
      <review></review>
    </task>

    <task id="admin-catch-page" priority="1" category="functional">
      <title>Admin Catch Recording Page</title>
      <description>
        New page at /admin/catch with a massive mic button as centerpiece.
        Dock-friendly UX: big tap target (120px+), tap-to-start/tap-to-stop,
        visual feedback for all states, auto-submit on stop.

        States: idle (ocean blue mic) → recording (pulsing red ring, 2-min countdown,
        audio level indicator) → processing (spinner, "Transcribing...")
        → done (green check, shows result) → error (red message, retry).

        Audio level indicator during recording: use AudioContext + AnalyserNode
        to show real-time amplitude on the mic button (e.g., ring thickness or
        glow intensity pulses with voice). Evan needs to know mic is picking up
        sound over dock noise/wind.

        2-minute cap: auto-stop AND auto-submit at 0:00. Same behavior as manual stop.

        Error state: retain audio blob in memory. "Retry" re-uploads same recording.
        "Re-record" is separate button that discards blob and returns to idle.
        Critical for spotty dock signal — don't lose a 2-minute recording on upload failure.

        Shows formatted result after processing. "Re-record" button to try again.
        "Clear catch" button to archive current live catch without replacing it.
        Shows current live catch below ("Currently showing to customers:").
        No review/edit step — Evan just talks and goes.

        Mic permission: handle denied state gracefully. Show explanation text
        with instructions to re-enable in browser settings if permission blocked.
      </description>
      <steps>
        - Create src/app/pages/admin/catch/CatchPage.tsx (server component)
          - Auth check (hasAdminAccess), fetch latest live CatchUpdate, pass to UI
        - Create src/app/pages/admin/catch/CatchUI.tsx (client component)
          - State machine: idle | recording | processing | done | error | permission-denied
          - MediaRecorder integration with MIME type detection (webm/mp4 fallback)
          - AudioContext + AnalyserNode for real-time audio level visualization
          - Big mic button (120px diameter, --radius-full)
          - Recording: pulsing red ring + amplitude indicator, 2-minute countdown timer
          - Auto-stop + auto-submit at 2:00
          - On stop: convert blob to ArrayBuffer, POST to /api/catch/record
          - Retain audio blob on error for retry without re-recording
          - Processing: spinner with status text
          - Done: show formatted catch items, "Re-record" button
          - Error: message + "Retry" (re-upload) + "Re-record" (start over) buttons
          - Permission denied: explanation text + browser settings instructions
          - "Clear catch" button (archives live catch, no replacement)
          - Below: current live catch display (if exists)
        - Create src/app/pages/admin/catch/catch-functions.ts (server functions)
          - clearCatch(): archives current live catch for org, revalidatePath("/")
        - Create src/app/pages/admin/catch/catch.css
          - .catch-mic button styles (idle, recording, processing, done)
          - Pulse animation keyframes
          - Audio level amplitude styles
          - Timer display
          - Result card styles
          - Permission denied state styles
          - Mobile-first, big touch targets
      </steps>
      <test_steps>
        1. Navigate to /admin/catch as admin user
        2. See big mic button in idle state
        3. Tap mic — browser requests microphone permission
        4. Grant permission — see recording state: red pulsing ring, countdown timer
        5. See audio level indicator responding to voice input
        6. Tap again to stop — see processing spinner
        7. After processing: see formatted catch result with "Re-record" button
        8. Tap "Re-record" — returns to idle state
        9. Wait 2 minutes while recording — auto-stops and auto-submits
        10. Test upload failure: see error with "Retry" and "Re-record" buttons
        11. Tap "Retry" — re-uploads same audio without re-recording
        12. Test "Clear catch" — current catch removed, home page falls back to FreshHero
        13. Deny mic permission — see helpful permission-denied message
        14. Test on mobile: mic button is easy to tap with thumb
        15. Test on iOS Safari: recording works with mp4 fallback
      </test_steps>
      <review></review>
    </task>

    <task id="admin-dashboard-nav" priority="2" category="functional">
      <title>Admin Dashboard Nav Card + Route</title>
      <description>
        Add "Fresh Catch" card to admin dashboard nav grid and register
        the /admin/catch route.
      </description>
      <steps>
        - Add nav card to AdminDashboardUI.tsx: mic emoji, "Fresh Catch", "Record what's available this week"
        - Add route to src/app/pages/admin/routes.ts: route("/catch", CatchPage)
        - Import CatchPage from ./catch/CatchPage
      </steps>
      <test_steps>
        1. Navigate to /admin — see 4th "Fresh Catch" card with mic icon
        2. Click card — navigates to /admin/catch
        3. Verify card matches existing card styling
      </test_steps>
      <review></review>
    </task>

    <task id="fresh-sheet" priority="2" category="functional">
      <title>Customer FreshSheet Component</title>
      <description>
        New component for the customer home page that displays formatted catch data.
        Text-only display (no audio playback). Ocean gradient card matching hero style.
        Shows headline, item list with Evan's notes, relative timestamp, and Order CTA.

        Staleness threshold: only show FreshSheet if catch is ≤7 days old.
        If catch is >7 days old OR no catch exists, fall back to FreshHero (quick actions).
        This prevents showing stale inventory that misleads customers.
      </description>
      <steps>
        - Create src/app/pages/home/components/FreshSheet.tsx
          - Ocean gradient card (same style language as FreshHero)
          - "This Week's Catch" label at top
          - Headline from Claude output
          - Item list: fish name + descriptive note per item
          - "Updated X hours ago" relative timestamp
          - "Order Now" CTA button at bottom (links to /orders/new)
          - Graceful empty state (parent handles fallback)
        - Export from src/app/pages/home/components/index.ts
        - Modify CustomerHome.tsx (server):
          - Fetch latest live CatchUpdate for org
          - Check staleness: only pass to UI if ≤7 days old
          - Parse JSON formattedContent, pass as catchData prop (or null if stale/missing)
        - Modify CustomerHomeUI.tsx (client):
          - Render FreshSheet when catchData exists
          - Render FreshHero when catchData is null (no catch or stale)
      </steps>
      <test_steps>
        1. With live CatchUpdate (≤7d old) in DB: home page shows FreshSheet
        2. With live CatchUpdate (>7d old) in DB: home page shows FreshHero fallback
        3. Without CatchUpdate: home page shows FreshHero with quick actions (fallback)
        4. FreshSheet shows headline, item list, timestamp, Order button
        5. "Order Now" button links to /orders/new
        6. Relative timestamp updates correctly ("2 hours ago", "yesterday")
        7. Mobile: component looks good at 375px width
        8. Gradient and styling matches existing hero aesthetic
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Admin can record voice note in < 3 taps from dashboard
    - Mic button is easily tappable on mobile with thumb
    - Audio level indicator confirms mic is picking up sound
    - Recording retained on upload failure (retry without re-recording)
    - Processing completes in < 15 seconds (Whisper + Claude Haiku)
    - Customer home page shows formatted catch text (≤7 days old)
    - Stale catch (>7d) falls back to FreshHero automatically
    - Admin can clear catch without recording a replacement
    - Fallback to FreshHero when no catch exists
    - Works on iOS Safari and Android Chrome
    - No audio playback exposed to customers
    - Re-record fully replaces previous catch
  </success_criteria>
</project_specification>
