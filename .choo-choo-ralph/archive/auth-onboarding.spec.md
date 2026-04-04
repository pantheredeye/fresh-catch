---
title: "Auth & Onboarding UX"
created: 2026-04-04
poured:
  - fresh-catch-mol-k6pqt
  - fresh-catch-mol-u96vj
  - fresh-catch-mol-o6v04
  - fresh-catch-mol-j5no9
  - fresh-catch-mol-i2pru
  - fresh-catch-mol-s3caq
  - fresh-catch-mol-09ez2
iteration: 0
auto_discovery: false
auto_learnings: false
---

<project_specification>
<project_name>Auth & Onboarding UX</project_name>
<overview>Streamline the first-time user journey based on real walkthrough of market.digitalglue.dev. Reduce registration screens, fix accessibility issues, add passkey at signup, add PWA install prompt. Source: auth-ux-review.md</overview>
<context>
  <existing_patterns>
    - Login component: src/app/pages/user/Login.tsx (client component, 5 flow states)
    - Auth server functions: src/app/pages/user/functions.ts (checkEmailExists, loginWithPassword, registerWithPassword, passkey flows)
    - Setup page: src/app/pages/admin/Setup.tsx (same contrast issue)
    - Design system: src/design-system/ (Button, Card, TextInput, Container)
    - Token --color-status-info-bg (#e0f2fe) exists but unused on info banners
    - @simplewebauthn/browser already imported in Login.tsx
    - startPasskeyRegistration + finishPasskeyRegistration already exist in functions.ts
    - Base UI (@base-ui/react ^1.0.0) already installed, used in UserMenu.tsx
    - EmailPromptBubble exists for chat email collection
    - No PWA manifest or service worker currently
    - public/ contains only favicon.svg
  </existing_patterns>
  <integration_points>
    - Login.tsx flow states: initial → confirm-register → register (needs simplification)
    - Document.tsx for manifest link tag
    - CustomerHomeUI.tsx for passkey nudge and install banner wiring
    - BottomNavigation.v2.tsx for menu upgrade
  </integration_points>
  <new_technologies>
    - Web App Manifest (manifest.json)
    - beforeinstallprompt API (PWA install)
  </new_technologies>
  <conventions>
    - Client components marked "use client"
    - Page components in src/app/pages/[feature]/components/
    - Design system tokens for all styling (never raw hex)
    - localStorage for client-side persistence (dismissals, preferences)
  </conventions>
</context>
<tasks>
  <task id="auth-flow-polish" priority="0" category="ux">
    <title>Streamline registration flow, fix contrast, polish login</title>
    <description>
Three related changes to Login.tsx and Setup.tsx, all touching the same auth flow:

1. REGISTRATION FLOW: Skip the confirm-register intermediate screen. When checkEmailExists returns exists:false, go directly to the register state with an inline info banner ("Creating new account for {email}") instead of forcing a separate confirmation step. Remove the confirm-register flow state or repurpose it.

2. CONTRAST FIX: The info banners use var(--color-status-info) (#0EA5E9 cyan) as background with var(--color-text-primary) (#1A2B3D dark) text. Poor contrast ~3:1. Change to var(--color-status-info-bg) (#e0f2fe light cyan) background + 3px left border in var(--color-status-info). Same fix in Setup.tsx:158.

3. LOGIN POLISH: Add autocomplete="email webauthn" to email field for browser credential hints. Make post-login redirect countdown skippable (click/tap anywhere to go immediately instead of waiting 2-3 seconds).

Files: src/app/pages/user/Login.tsx (primary), src/app/pages/admin/Setup.tsx (contrast only)
    </description>
    <steps>
      - Read Login.tsx fully, map all flow state transitions
      - Remove or bypass confirm-register state: handleContinue goes from initial → register when !exists
      - Add inline banner in register state: "Creating account for {email}" with --color-status-info-bg background
      - Fix all info banner backgrounds from --color-status-info to --color-status-info-bg + left border accent
      - Apply same contrast fix in Setup.tsx
      - Add autocomplete="email webauthn" to email TextInput
      - Make countdown redirect clickable (wrap in a button/div with onClick → navigate immediately)
    </steps>
    <test_steps>
      1. Enter new email → should go directly to password form (no intermediate "no account found" screen)
      2. Info banner should be light cyan background with dark text (readable)
      3. Enter existing email → should go to login-password or login-passkey as before
      4. After successful login, tap anywhere during countdown → should redirect immediately
      5. Check Setup.tsx loading states have same contrast fix
      6. Browser should suggest saved email/passkey credentials on email field
    </test_steps>
    <review></review>
  </task>
  <task id="passkey-at-signup" priority="1" category="feature">
    <title>Passkey option at registration + post-signup nudge</title>
    <description>
Two passkey improvements:

1. PASSKEY AT REGISTRATION: On the register form, show password fields by default. Below the password fields, add an "Or register with passkey" button/link + hint text "You can manage passkeys in settings". Tapping the passkey option triggers WebAuthn registration via existing startPasskeyRegistration/finishPasskeyRegistration functions, skipping password fields. Both paths create the account in one step.

Resolved: Sequential layout, not side-by-side. Password is the obvious default path to avoid decision paralysis. Passkey option is visible but secondary.

2. PASSKEY NUDGE: After a user registers with password, show a temporary banner on the home page suggesting passkey addition. Behavior: appears once post-registration (detect via a flag in the registration response or a localStorage marker), dismissable with X, stores dismissal in localStorage. Re-appears once on next session if not added and not dismissed twice. Component lives at src/app/pages/home/components/PasskeyNudge.tsx.

Files: src/app/pages/user/Login.tsx, src/app/pages/user/functions.ts, new PasskeyNudge.tsx, CustomerHomeUI.tsx
    </description>
    <steps>
      - Add passkey registration option to register flow state in Login.tsx
      - Wire to existing startPasskeyRegistration/finishPasskeyRegistration in functions.ts
      - Create PasskeyNudge.tsx component with localStorage persistence logic
      - Wire PasskeyNudge into CustomerHomeUI.tsx (show after password registration)
      - Set localStorage marker on password registration completion
      - Nudge dismissal logic: show once, re-show once next session, then stop
    </steps>
    <test_steps>
      1. New user registers with passkey → account created, no password fields shown
      2. New user registers with password → account created, redirect to home, nudge banner appears
      3. Dismiss nudge → gone for this session
      4. Return next session → nudge appears once more
      5. Dismiss again → never shown again
      6. User who already has passkey → nudge never shown
    </test_steps>
    <review></review>
  </task>
  <task id="pwa-install" priority="2" category="feature">
    <title>PWA manifest and install-to-homescreen prompt</title>
    <description>
Add PWA support for install-to-homescreen (not full offline support yet).

1. Create public/manifest.json with app name, icons (generate from existing favicon.svg), theme color matching --color-action-primary, display: standalone, start_url: /

2. Add link rel="manifest" to Document.tsx head

3. Create InstallBanner.tsx component:
   - Detects beforeinstallprompt event (Chrome/Android/Edge) → shows "Install Fresh Catch" button
   - On iOS Safari: detects standalone capability → shows "Tap Share → Add to Home Screen" instructions
   - Appears after user has scrolled or interacted (not immediately on load)
   - Dismissable, respects localStorage "don't show again"
   - Styled as a subtle top banner, not a modal

Files: public/manifest.json (new), src/app/Document.tsx, new src/app/pages/home/components/InstallBanner.tsx, CustomerHomeUI.tsx
    </description>
    <steps>
      - Create manifest.json with proper fields and icon references
      - Generate PNG icons from favicon.svg (192x192, 512x512) for manifest
      - Add manifest link + theme-color meta to Document.tsx
      - Build InstallBanner component with beforeinstallprompt detection
      - Add iOS Safari detection and manual instructions fallback
      - Wire into CustomerHomeUI with delayed appearance (after scroll/interaction)
      - localStorage for dismissal persistence
    </steps>
    <test_steps>
      1. manifest.json loads (check DevTools → Application → Manifest)
      2. On Android Chrome: install prompt appears after interaction
      3. On iOS Safari: "Add to Home Screen" instructions shown
      4. Dismiss banner → stays dismissed
      5. Installed PWA opens in standalone mode (no browser chrome)
      6. Already installed → banner doesn't appear
    </test_steps>
    <review></review>
  </task>
</tasks>
</project_specification>
