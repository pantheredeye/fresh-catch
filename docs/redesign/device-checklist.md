# Device checklist — Tideline (#75)

What's automated vs. what still needs a human on a real phone, per the
epic's own risk list (`docs/redesign/fresh-catch-handoff.md` §4: "Nothing
has been tested on a real device in real sunlight, which is the only test
that matters here").

## Already automated (don't re-check by hand)

- One `<h1>` per route, no skipped heading levels, `<main id="main">`
  landmark, skip link is the first focusable element, every field has a
  matching label — `src/ui/a11y.test.ts`, runs across every GET HTML route
  including `/admin/*`.
- `<meta name="color-scheme" content="light">`, no `maximum-scale`/
  `user-scalable` in the viewport meta (pinch zoom stays available).
- No raw hex/`rgba()` colour literal outside email templates; no `style=`
  attr; no raw `.btn` class outside `src/ui/` — `a11y.test.ts` /
  `design-guardrails.test.ts`.
- Palette contrast: every text/surface pair actually rendered (body text
  7:1, large text/badges 4.5:1, control borders 3:1), plus on-dark bands and
  the closed-status strip — `design-guardrails.test.ts`.
- JS-off render of `/`: the saved-markets band ships real `hidden` markup
  rather than an empty mount point, enhancement scripts are inert
  `<script type="module">` tags that don't gate content — `a11y.test.ts`.

## Manual — no browser/DOM-layout test infra in this repo

This repo's test suite is `@cloudflare/vitest-pool-workers` only (server-side
HTTP assertions against string HTML) — no Playwright/Puppeteer, so the two
items below need a human with a real browser, not a script:

- [ ] **No horizontal overflow, 195px–430px.** Narrow an actual browser
  window (not CSS `zoom` — it doesn't trigger media queries, so it under-
  and over-reports). 195px is the reflow equivalent of 200% zoom on a small
  phone. Check: `/`, `/markets/:id`, `/markets/past`, `/requests/new`,
  `/requests`, `/requests/:id`, `/login`, `/admin`, `/admin/markets`,
  `/admin/markets/new`, `/admin/markets/:id/edit`, `/admin/catch`,
  `/admin/vendor`, `/admin/requests`, `/admin/requests/new`,
  `/admin/requests/:id`.
- [ ] **Real-device pass** (Barrett): actual phone, actual sunlight.
  - Every tap target reachable one-handed, nothing under 58px.
  - Legible in direct sun (this was the old app's actual failure mode —
    the whole reason Tideline is light-only).
  - VoiceOver: the requests/inbox link lists read self-describing (status +
    contact, not just "link, link, link").
  - Recording a catch on `/admin/catch`: mic button toggles, publish stays
    disabled until a draft is ready, then works.
  - Favorite star on a market detail page toggles and persists on reload.
