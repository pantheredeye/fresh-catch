---
title: "Auth Simplification"
created: 2026-04-06
poured:
  - fresh-catch-mol-72qgu
  - fresh-catch-mol-c2yri
  - fresh-catch-mol-cwcgt
  - fresh-catch-mol-1s9ex
  - fresh-catch-mol-cbwwo
  - fresh-catch-mol-9bthb
  - fresh-catch-mol-kpvqi
  - fresh-catch-mol-uhp0l
  - fresh-catch-mol-m3b3i
  - fresh-catch-mol-bsmp7
  - fresh-catch-mol-0aqjf
  - fresh-catch-mol-xji1w
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Auth Simplification</project_name>

  <overview>
    Strip the auth system to its reliable core. After 6 iterations, real customers still can't get through cleanly: emails don't arrive (fire-and-forget swallows errors), white screen after name entry, passkey nudge never surfaces. The implementation overbuilt the research doc vision with magic links, conditional mediation, WebOTP, and device binding — all adding complexity for a mobile-first older demographic at farmers markets.

    Goal: OTP-only email auth + passkey upgrade path. Remove magic links, conditional mediation, WebOTP. Fix email deliverability, white screen, and passkey nudge bugs. Add email prefill for returning users.
  </overview>

  <context>
    <existing_patterns>
      - RWSDK server functions pattern: "use server" functions in functions.ts, called from "use client" Login.tsx
      - Session management via Durable Objects (src/session/durableObject.ts, store.ts)
      - Session rotation on auth state change via rotateSession() in src/session/store.ts
      - CSRF tokens generated in session DO, validated via requireCsrf() in src/session/csrf.ts
      - Rate limiting via RateLimitDurableObject (src/rate-limit/durableObject.ts)
      - Email sending via Resend API (src/utils/email.ts)
      - Middleware chain in src/worker.tsx: origin validation → headers → session loading → user context → routing
    </existing_patterns>
    <integration_points>
      - src/worker.tsx: Remove /auth/verify route, keep all other middleware
      - src/session/store.ts: Remove magic token functions (saveOtp magicToken param, verifyMagicTokenViaSession)
      - src/session/durableObject.ts: Remove magicToken/deviceId from OTP state
      - src/utils/email.ts: Simplify sendOtpEmail HTML and signature, change from domain to freshcatch.app
      - src/app/pages/user/Login.tsx: Main client component, 928 lines → ~650 lines after cleanup
      - src/app/pages/user/functions.ts: Remove device binding, conditional passkey, await email send
      - src/app/pages/user/routes.ts: Remove dead /join redirect
    </integration_points>
    <new_technologies>
      - None — purely removing complexity, no new tech
    </new_technologies>
    <conventions>
      - Server components fetch data, pass to client components as props
      - Client components handle interactivity, call server functions for mutations
      - File structure: FeaturePage.tsx (server), FeatureUI.tsx (client), functions.ts (server fns)
      - Design system tokens used everywhere (var(--color-*), var(--space-*))
      - Incremental commits on feature branches (bbb-* naming)
    </conventions>
  </context>

  <tasks>
    <task id="delete-magic-link" priority="0" category="infrastructure">
      <title>Delete magic link handler and route</title>
      <description>
        Remove the entire magic link verification flow. Delete magic-link-handler.ts, remove /auth/verify route from worker.tsx, clean up Login.tsx URL param handling that was only for magic link redirects.
      </description>
      <steps>
        - Delete src/app/pages/user/magic-link-handler.ts
        - Remove /auth/verify route and handleMagicLinkVerify import from src/worker.tsx
        - Remove magic link URL params handling from Login.tsx: ?flow=name&admin=&pk= useEffect, ?error=link-expired/invalid-link handling
      </steps>
      <test_steps>
        1. pnpm run types — no type errors from removed imports
        2. Grep for "magic-link-handler" and "auth/verify" — zero hits in src/ (except comments)
      </test_steps>
      <review></review>
    </task>

    <task id="strip-session-magic" priority="0" category="infrastructure">
      <title>Strip magic token and device binding from session layer</title>
      <description>
        Remove magic token storage/verification from session Durable Object and store. Remove device binding (fc_device cookie, deviceId generation). Simplify saveOtp to only store code + email.
      </description>
      <steps>
        - In src/session/durableObject.ts: remove magicToken and deviceId from OTP state interface and storage
        - In src/session/store.ts: remove verifyMagicTokenViaSession export, remove magicToken param from saveOtp, simplify OTP storage to just {code, email, createdAt, attempts}
        - In src/app/pages/user/functions.ts requestOtp(): remove deviceId generation, remove fc_device cookie setting, remove magicToken from saveOtp call, remove magic link URL construction, remove APP_URL fallback usage for magic link
      </steps>
      <test_steps>
        1. pnpm run types — no type errors
        2. Grep for "magicToken", "deviceId", "fc_device", "verifyMagicToken" — zero hits in src/
      </test_steps>
      <review></review>
    </task>

    <task id="strip-conditional-mediation" priority="1" category="functional">
      <title>Remove conditional mediation (passkey autofill)</title>
      <description>
        Remove the useEffect that silently offers passkey via email input autocomplete. This is the feature that requires autoComplete="email webauthn" which breaks mobile email autofill for everyone.
      </description>
      <steps>
        - Remove conditional mediation useEffect (Login.tsx ~lines 158-191)
        - Remove conditionalAbortRef ref
        - Remove startConditionalPasskeyLogin from imports and from functions.ts export
        - Remove browserSupportsWebAuthnAutofill import
        - Fix autoComplete="email webauthn" → autoComplete="email" on email input (line 558)
      </steps>
      <test_steps>
        1. pnpm run types — no type errors
        2. Load /login on mobile — email autofill shows saved emails (not passkey prompts)
        3. Grep for "webauthn" in Login.tsx — zero hits
      </test_steps>
      <review></review>
    </task>

    <task id="strip-webotp" priority="1" category="infrastructure">
      <title>Remove WebOTP API</title>
      <description>
        Remove the WebOTP useEffect that tries to auto-read OTP codes from SMS/email notifications. Only works on Android Chrome with SMS, not email OTP. Also remove the hidden OTP input that supported this.
      </description>
      <steps>
        - Remove WebOTP useEffect (Login.tsx ~lines 239-256)
        - Remove hiddenOtpRef and the hidden input element (~lines 683-700)
        - Remove handleHiddenOtpChange handler (~lines 520-528)
      </steps>
      <test_steps>
        1. pnpm run types — no type errors
        2. Grep for "OTPCredential" and "hiddenOtp" — zero hits
      </test_steps>
      <review></review>
    </task>

    <task id="fix-email-delivery" priority="1" category="functional">
      <title>Fix email deliverability — await send, change domain, simplify HTML</title>
      <description>
        Three email issues: (1) fire-and-forget swallows failures — Evan never got his email and we'll never know why. (2) OTP emails send from auth@digitalglue.dev but order emails from orders@freshcatch.app — different domain/SPF/DKIM/reputation. (3) Email HTML still has magic link button.

        Change all email sending to freshcatch.app domain. Await send result and log it. Simplify email HTML.
      </description>
      <steps>
        - In functions.ts requestOtp(): await sendOtpEmail() instead of fire-and-forget, log success/failure with email address
        - If send fails, still return success to client (anti-enumeration) but log warning
        - In src/utils/email.ts sendOtpEmail(): change from address to 'Fresh Catch auth@freshcatch.app'
        - In src/utils/email.ts sendOtpEmail(): update function signature — remove magicUrl param, accept only {to, code}
        - In src/utils/email.ts sendOtpEmail(): remove magic link button HTML, remove WebOTP annotation (@market.digitalglue.dev #code)
        - Keep: OTP code display, "Expires in 10 minutes", footer
        - Also update fallback APP_URL from market.digitalglue.dev → freshcatch.app in email.ts:202 (sendChatReplyNotificationEmail)
      </steps>
      <test_steps>
        1. Trigger OTP send — check worker logs for success/failure with email address
        2. Receive email — from address is @freshcatch.app, no magic link button, just the 6-digit code
        3. Email renders properly in Gmail/iOS Mail
        4. Grep for "digitalglue" in src/utils/email.ts — only the dead OtpVerification.tsx should remain
      </test_steps>
      <review></review>
    </task>

    <task id="fix-otp-screen-copy" priority="1" category="style">
      <title>Update OTP screen copy and audit "passkey" text</title>
      <description>
        Two copy issues: (1) OTP screen says "Tap the button in the email to sign in instantly, or enter the code above" — references a magic link button that no longer exists. (2) Research doc says "Never say passkey. Say fingerprint or face." One error message says "Passkey verification failed."
      </description>
      <steps>
        - Update Login.tsx line 757-758: change "Tap the button in the email to sign in instantly, or enter the code above" → "Enter the 6-digit code from your email" or similar
        - Fix Login.tsx line 405: "Passkey verification failed. Try the code instead." → "Verification failed. Try the code instead."
        - Audit all user-facing strings in Login.tsx — internal variable names (passkeyDismissed, etc.) are fine, only visible text matters
        - User-facing text audit results:
          - Line 583: "Use your fingerprint or face to sign in" ✓ good
          - Line 805: "Sign in with fingerprint instead" ✓ good  
          - Line 851: "Use your fingerprint or face to skip the code" ✓ good
          - Line 405: "Passkey verification failed" ✗ fix
      </steps>
      <test_steps>
        1. Grep for user-visible "passkey" (case-insensitive) in Login.tsx JSX strings — zero hits
        2. OTP screen text makes sense without magic link context
      </test_steps>
      <review></review>
    </task>

    <task id="fix-success-redirect" priority="1" category="functional">
      <title>Brief flash success screen then redirect</title>
      <description>
        Replace the 2-second countdown with a brief ~500ms flash of "You're in!" then immediate redirect. Removes the countdown state and "Go now" link complexity.
      </description>
      <steps>
        - Change goToSuccess() to set countdown to 1 (or remove countdown entirely)
        - Update success screen countdown useEffect: wait ~500ms then redirect via window.location.href
        - Remove countdown display text ("Redirecting in {countdown}...")
        - Keep "You're in!" heading
        - Keep "Go now" link as fallback (in case redirect is slow)
        - Remove countdown state if no longer needed (or repurpose for the 500ms timer)
      </steps>
      <test_steps>
        1. After OTP verification → brief "You're in!" flash → lands on home/admin
        2. No "Redirecting in 2..." text visible
      </test_steps>
      <review></review>
    </task>

    <task id="fix-passkey-nudge" priority="1" category="functional">
      <title>Fix passkey nudge — ensure email state is populated</title>
      <description>
        The passkey nudge calls startPasskeyRegistration(email.trim()) but email state was empty when arriving via magic link redirect. After removing magic links, the only path is email screen → OTP → name → nudge, so email should always be populated. Verify and add defensive guard.
      </description>
      <steps>
        - Verify that after OTP verification, email state is always populated (set from email input screen)
        - In handlePasskeySetup(): add guard — if email is empty, skip nudge and go to success
        - Trace: email screen → handleEmailSubmit (email populated) → OTP → verifyOtp → navigateAfterOtp → name → passkey nudge → handlePasskeySetup uses email ✓
      </steps>
      <test_steps>
        1. New user: email → OTP → name → passkey nudge appears → "Set it up" triggers biometric prompt
        2. Biometric fails/cancelled → "No problem, set up later" → Continue works
        3. "Skip for now" → redirects to home/admin
      </test_steps>
      <review></review>
    </task>

    <task id="fix-white-screen" priority="1" category="functional">
      <title>Investigate and fix white screen after name entry</title>
      <description>
        User sees white screen after entering name, refresh fixes it. Session cookie from rotateSession() during verifyOtp() may not propagate to browser before window.location.href redirect. After removing magic links, the name screen only triggers from OTP flow, which may itself fix the issue.
      </description>
      <steps>
        - After removing magic link flow, test if white screen still occurs
        - If still occurs: check that rotateSession() cookies from verifyOtp() are in the RSC response
        - Consider: instead of window.location.href, use an anchor tag click or form submission
        - Verify the success screen redirect also works (same mechanism)
      </steps>
      <test_steps>
        1. New user: email → OTP → name → enter name → should NOT white screen
        2. New user: email → OTP → name → passkey nudge → skip → should NOT white screen
        3. Returning user: email → OTP → success → redirect works, no white screen
      </test_steps>
      <review></review>
    </task>

    <task id="add-email-prefill" priority="2" category="functional">
      <title>Remember and prefill email for returning users</title>
      <description>
        Research doc shows returning user flow starts with "Email pre-filled → Continue". Use localStorage to remember the last successfully authenticated email and prefill the input on next visit. Reduces friction for weekly/biweekly market visitors who forget which email they used.
      </description>
      <steps>
        - After successful OTP verification (in navigateAfterOtp or verifyOtp success path): save email to localStorage key "fc_email"
        - After successful passkey login (in goToSuccess after passkey): save email to localStorage
        - On Login component mount: read localStorage "fc_email", prefill email state if found
        - Show a small "Not you?" or "Different email" link when prefilled, which clears the stored email and the input
        - Don't prefill if ?b= param is present with a different vendor context (edge case, maybe skip this)
      </steps>
      <test_steps>
        1. Log in with email → log out → visit /login → email is prefilled
        2. Click "Different email" / clear → input empties, localStorage cleared
        3. Private/incognito window → no prefill (localStorage empty)
      </test_steps>
      <review></review>
    </task>

    <task id="cleanup-dead-files" priority="2" category="infrastructure">
      <title>Delete dead files and routes</title>
      <description>
        Remove files and routes that are no longer needed after the simplification.
      </description>
      <steps>
        - Delete src/emails/OtpVerification.tsx (unused React email template, inline HTML used instead)
        - Remove /join redirect from src/app/pages/user/routes.ts line 9
      </steps>
      <test_steps>
        1. pnpm run types — no type errors
        2. pnpm run build — builds successfully
        3. Grep for "OtpVerification" — zero hits
      </test_steps>
      <review></review>
    </task>

    <task id="verify-end-to-end" priority="2" category="functional">
      <title>End-to-end verification of all auth flows</title>
      <description>
        Full manual test of every auth path after all changes are complete.
      </description>
      <steps>
        - Test new user flow: email → OTP → name → passkey nudge → skip → home
        - Test new user flow: email → OTP → name → passkey nudge → set up → biometric → home
        - Test returning user with passkey: email (prefilled) → biometric prompt → admin/home
        - Test returning user with passkey, biometric fails: → "Send me a code" → OTP → admin/home
        - Test returning user without passkey: email (prefilled) → OTP → passkey nudge → skip → admin/home
        - Test rate limiting: rapid OTP requests → rate limit message
        - Test invalid code: enter wrong code → error → retry
        - Verify logout still works: /logout → redirect to /
        - Verify all emails come from @freshcatch.app
        - Verify no user-facing text says "passkey"
        - Verify email prefill works across sessions
      </steps>
      <test_steps>
        1. All flows above complete without white screens
        2. Emails arrive reliably from @freshcatch.app (check Resend dashboard)
        3. Passkey registration actually works on a real device
        4. Session persists across page refreshes
        5. pnpm run types passes
        6. Grep for "digitalglue" in src/ — zero hits except CustomerFooter.tsx (separate concern)
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Email OTP arrives reliably from @freshcatch.app (no fire-and-forget)
    - No white screens after any auth transition
    - Passkey nudge actually appears and works for new users
    - Passkey login works for returning users with registered passkeys
    - Zero references to magic links, conditional mediation, WebOTP in codebase
    - No user-facing text says "passkey" — always "fingerprint or face"
    - Email prefilled for returning users
    - Login flow is: email (prefilled) → code/biometric → (name) → (passkey nudge) → done
    - Older users at farmers market on phone can get through without confusion
  </success_criteria>

</project_specification>
