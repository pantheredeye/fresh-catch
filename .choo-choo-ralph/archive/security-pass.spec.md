---
title: "Auth Security Pass"
created: 2026-04-04
poured:
  - fresh-catch-mol-wqzr
  - fresh-catch-mol-oarw
  - fresh-catch-mol-k2ks
  - fresh-catch-mol-z4er1
  - fresh-catch-mol-3b49
  - fresh-catch-mol-z4noh
  - fresh-catch-mol-v4j3v
  - fresh-catch-mol-z9hys
  - fresh-catch-mol-tv2z5
  - fresh-catch-mol-dj9zp
  - fresh-catch-mol-x1uxg
  - fresh-catch-mol-tguzl
  - fresh-catch-mol-7wy71
  - fresh-catch-mol-4km4z
  - fresh-catch-mol-nj0fz
iteration: 0
auto_discovery: false
auto_learnings: false
---

<project_specification>
<project_name>Auth Security Pass</project_name>
<overview>Security hardening for authentication system. Audit found 3 HIGH and 2 MEDIUM severity issues. Password hashing (PBKDF2-SHA256 600k iterations) and security headers are solid.</overview>
<context>
  <existing_patterns>
    - Auth in src/app/pages/user/functions.ts (login, register, checkEmailExists)
    - Session via Durable Objects in src/session/durableObject.ts
    - Password hashing in src/utils/password.ts (PBKDF2-SHA256, good)
    - Security headers in src/app/headers.ts (HSTS, CSP, etc - good)
    - WebAuthn via @simplewebauthn packages
  </existing_patterns>
  <integration_points>
    - src/worker.tsx (middleware, routing)
    - src/app/pages/user/Login.tsx (client-side validation)
    - wrangler.jsonc (Cloudflare config, potential WAF rate limiting)
  </integration_points>
  <new_technologies>
    - Cloudflare rate limiting (WAF rules or custom DO counter)
  </new_technologies>
  <conventions>
    - RWSDK server functions pattern
    - Durable Objects for persistent state
  </conventions>
</context>
<tasks>
  <task id="sec-rate-limit" priority="0" category="security">
    <title>Rate limiting + email enumeration mitigation</title>
    <description>Add IP-based rate limiting to all auth endpoints using a Durable Object counter. Includes email enumeration mitigation (jitter + generic errors) since both share the rate limit infra.</description>
    <steps>
      - Create RateLimitDO (Durable Object) for IP+endpoint tracking
      - Limits: 5 login/email per 15 min, 3 registrations/IP per hour, 10 checkEmailExists/IP per 15 min
      - Wire into auth routes in worker.tsx as middleware
      - Return 429 with Retry-After header
      - Add artificial delay (200-500ms random) to checkEmailExists to normalize response time
      - Unify registration error messages — no "already registered" distinction
    </steps>
    <test_steps>
      1. Attempt 6 logins in 15 min - 6th should return 429
      2. Attempt 4 registrations from same IP - 4th should return 429
      3. Rapid email checks should hit rate limit at 10
      4. Wait for window expiry - attempts should work again
      5. Different IPs should have independent limits
      6. Response time consistent for existing vs non-existing emails
      7. Registration with existing email returns generic error
    </test_steps>
    <review></review>
  </task>
  <task id="sec-account-lockout" priority="0" category="security">
    <title>Account lockout after failed attempts</title>
    <description>After 5 failed password attempts, lock account for 15 min. No info leak - same error message regardless. State stored in User record (Prisma) for durability.</description>
    <steps>
      - Add failedAttempts (Int, default 0) and lockedUntil (DateTime, nullable) to User model in schema.prisma
      - Create migration
      - After 5 failures: set lockedUntil = now + 15 min, return same "Invalid email or password" message
      - Check lockedUntil before validating password — if locked, same generic error
      - Auto-unlock: if lockedUntil < now, treat as unlocked
      - Reset failedAttempts on successful login
      - Update loginWithPassword in functions.ts
    </steps>
    <test_steps>
      1. Enter wrong password 5 times - account should lock
      2. Correct password during lockout should still fail (same error msg)
      3. After 15 min, correct password should work
      4. Successful login should reset counter
    </test_steps>
    <review></review>
  </task>
  <task id="sec-password-policy" priority="1" category="security">
    <title>NIST 800-63B password policy</title>
    <description>Replace complexity rules with NIST-aligned policy: minimum 8 chars, check against breached password list (Have I Been Pwned top 100k), no forced complexity rules.</description>
    <steps>
      - Server-side: min 8 chars + breach list check in registerWithPassword (functions.ts)
      - Bundle top 100k breached passwords as static set (or use k-anonymity HIBP API)
      - Remove any uppercase/number requirements
      - Client-side: show "password too common" or "too short" feedback
      - Mirror validation in Login.tsx for UX
    </steps>
    <test_steps>
      1. "pass" (too short) should fail
      2. "password123" (breached) should fail with "too common" message
      3. "correct horse battery staple" style passphrases should pass
      4. No uppercase/number/symbol requirements enforced
    </test_steps>
    <review></review>
  </task>
  <task id="sec-csrf" priority="1" category="security">
    <title>CSRF protection for state-changing operations</title>
    <description>RWSDK server functions are POST+JSON+SameSite which covers API-style calls. But the app has HTML forms (order form, site update forms) that need explicit CSRF tokens since form submissions send as application/x-www-form-urlencoded and bypass the JSON content-type check.</description>
    <steps>
      - Verify SameSite=Strict on session cookies in durableObject.ts
      - Add Origin header validation middleware in worker.tsx (reject mismatched origins)
      - Generate per-session CSRF token, store in session DO
      - Add hidden CSRF field to order form and other HTML forms
      - Validate CSRF token server-side on form submissions
    </steps>
    <test_steps>
      1. Cross-origin POST to login should be rejected
      2. Same-origin POST should work normally
      3. Session cookies should have SameSite=Strict
      4. Form submission without CSRF token should be rejected
      5. Form submission with valid CSRF token should succeed
    </test_steps>
    <review></review>
  </task>
  <task id="sec-session-fixation" priority="0" category="security">
    <title>Rotate session ID on authentication</title>
    <description>Session ID persists across login — pre-auth and post-auth use the same DO ID. Attacker with a pre-auth session ID can hijack the session after victim authenticates. Rotate session on all auth state changes.</description>
    <steps>
      - In all login flows (loginWithPassword, finishPasskeyLogin, registerWithPassword, finishPasskeyRegistration): revoke old session, create new session with fresh ID
      - Update functions.ts to call sessions.revoke() then sessions.save() with new ID
      - Ensure new session cookie is set in response
      - Also rotate on logout (already revoked, but confirm)
    </steps>
    <test_steps>
      1. Note session ID before login — should change after successful login
      2. Old session ID should be invalid post-login
      3. Registration should also produce a new session ID
      4. Passkey login should rotate session ID
    </test_steps>
    <review></review>
  </task>
</tasks>
</project_specification>
