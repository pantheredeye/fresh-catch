---
title: "Security Audit Round 2"
created: 2026-03-22
poured: []
iteration: 1
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Security Audit Round 2</project_name>

  <overview>
    Follow-up security audit after the initial Architecture Hardening epic.
    Many critical issues (role escalation, route guards, session revalidation,
    org-type permissions) were fixed. This spec covers remaining gaps found
    in deeper review of auth flows, IDOR risks, input validation, and headers.
  </overview>

  <context>
    <existing_patterns>
      - Admin order functions use hasAdminAccess(ctx) but don't verify order.organizationId matches ctx
      - Permission functions now check org type === "business" (fixed in hardening)
      - Session role re-validated from DB each request (fixed in hardening)
      - WebAuthn uses @simplewebauthn with challenge stored in session DO
      - Security headers defined in src/app/headers.ts with CSP + HSTS
      - Market CRUD in src/app/pages/admin/market-functions.ts has no input length validation
      - Stripe webhook in src/api/stripe-webhook.ts does signature verification + dedup
    </existing_patterns>
    <integration_points>
      - src/app/pages/admin/order-functions.ts - confirmOrder, completeOrder, cancelOrderAdmin, markAsPaid
      - src/app/pages/user/functions.ts - finishPasskeyLogin (counter check), challenge lifecycle
      - src/app/pages/admin/market-functions.ts - createMarket, updateMarket
      - src/app/pages/admin/team/team-functions.ts - createInvite (email requirement)
      - src/app/headers.ts - CSP directives
      - src/api/stripe-webhook.ts - payment amount updates
      - src/session/durableObject.ts - challenge storage
      - wrangler.jsonc - join codes in vars
    </integration_points>
    <new_technologies>
      - No new tech required
    </new_technologies>
    <conventions>
      - Server functions validate inputs at top, return {success, error} objects
      - Org-scoped queries use where: { id, organizationId: ctx.currentOrganization.id }
      - Input validation pattern: check length, return error string (see createOrder, updateProfile)
    </conventions>
  </context>

  <tasks>
    <task id="order-org-scoping" priority="0" category="functional">
      <title>Add org verification to admin order functions</title>
      <description>
        confirmOrder, completeOrder, cancelOrderAdmin, and markAsPaid check
        hasAdminAccess() but don't verify order.organizationId === ctx.currentOrganization.id.
        Defense-in-depth gap — worker middleware validates membership, but if session
        context drifts, admin of org A could operate on org B's orders.
      </description>
      <steps>
        - In each admin order function, after fetching order, add: if (order.organizationId !== ctx.currentOrganization.id) return error
        - Apply to: confirmOrder, completeOrder, cancelOrderAdmin, markAsPaid
        - Follow same pattern as updateMarket (market-functions.ts line 60-65)
      </steps>
      <test_steps>
        1. Confirm order as admin of correct org → success
        2. Attempt to confirm order belonging to different org → rejected
        3. Verify all four functions reject cross-org operations
      </test_steps>
      <review></review>
    </task>

    <task id="credential-counter-check" priority="0" category="functional">
      <title>Validate WebAuthn credential counter on login</title>
      <description>
        finishPasskeyLogin() updates the credential counter but never checks if
        newCounter decreased — a cloning attack indicator per WebAuthn spec.
        @simplewebauthn verifies the counter internally but we should also reject
        if counter goes backwards.
      </description>
      <steps>
        - In finishPasskeyLogin, after verification, check: if (verification.authenticationInfo.newCounter > 0 && verification.authenticationInfo.newCounter <= credential.counter) throw error
        - Log the event for monitoring (cloning attempt detected)
        - Note: counter === 0 is valid for some authenticators that don't implement counters
      </steps>
      <test_steps>
        1. Normal login → counter increments, success
        2. Manually set credential counter higher than next auth → verify rejection
        3. Verify authenticators with counter=0 still work
      </test_steps>
      <review></review>
    </task>

    <task id="challenge-expiration" priority="1" category="functional">
      <title>Add WebAuthn challenge expiration</title>
      <description>
        Session challenges have no expiration. A challenge generated hours ago
        can still be used. Should expire after 5 minutes per WebAuthn best practice.
      </description>
      <steps>
        - When storing challenge in session, also store challengeCreatedAt timestamp
        - In finishPasskeyRegistration and finishPasskeyLogin, check: if (Date.now() - challengeCreatedAt > 5 * 60 * 1000) reject
        - Clear both challenge and challengeCreatedAt after use (already clearing challenge)
      </steps>
      <test_steps>
        1. Start registration/login, complete within 5 min → success
        2. Start registration/login, wait >5 min (or mock time) → verify rejection with clear error
        3. Verify challenge cleared after successful use
      </test_steps>
      <review></review>
    </task>

    <task id="join-code-cleanup" priority="1" category="functional">
      <title>Remove MANAGER_CODE, make ADMIN_CODE one-time-use</title>
      <description>
        MANAGER_CODE is redundant — invite system handles manager onboarding.
        ADMIN_CODE is a bootstrap mechanism (Evan becomes owner). Should only
        work once: if org already has an owner, reject the code.
      </description>
      <steps>
        - Remove MANAGER_CODE from wrangler.jsonc vars and .dev.vars
        - Remove manager code branch from addMembershipWithJoinCode in src/app/pages/user/functions.ts
        - In the admin code branch, before creating membership, check if org already has an owner: query Membership where { organizationId, role: 'owner' }
        - If owner exists, return error "Organization already has an owner"
        - Remove /join UI references to manager code if any
        - Update JoinPage to only show owner code flow
      </steps>
      <test_steps>
        1. Use admin code when no owner exists → success, Evan becomes owner
        2. Use admin code again (owner exists) → rejected
        3. Manager code no longer accepted → error
        4. Invite flow for managers still works normally
      </test_steps>
      <review></review>
    </task>

    <task id="csp-frame-ancestors" priority="1" category="functional">
      <title>Add frame-ancestors to CSP</title>
      <description>
        Content-Security-Policy in src/app/headers.ts is missing frame-ancestors
        directive. Without it, the app could be embedded in iframes for clickjacking.
      </description>
      <steps>
        - Add frame-ancestors 'none' to the CSP header in src/app/headers.ts
        - Place after existing frame-src directive
      </steps>
      <test_steps>
        1. Check response headers in browser devtools → frame-ancestors 'none' present
        2. Try embedding app in iframe on another domain → blocked
        3. Verify Cloudflare challenge iframes still work (they use frame-src, not frame-ancestors)
      </test_steps>
      <review></review>
    </task>

    <task id="market-input-validation" priority="2" category="functional">
      <title>Add input validation to market functions</title>
      <description>
        createMarket and updateMarket accept name, schedule, subtitle,
        locationDetails, customerInfo without any length validation.
        Could allow very large payloads. Other functions (createOrder,
        updateProfile) have proper length checks.
      </description>
      <steps>
        - Add length validation matching existing patterns: name <200, schedule <500, subtitle <200, locationDetails <500, customerInfo <1000
        - Require name field (non-empty)
        - Return {success: false, error: "..."} on validation failure
        - Apply to both createMarket and updateMarket
      </steps>
      <test_steps>
        1. Create market with valid data → success
        2. Create market with empty name → rejected
        3. Create market with 1000-char name → rejected
        4. Update market with oversized fields → rejected
      </test_steps>
      <review></review>
    </task>

    <task id="webhook-atomic-updates" priority="2" category="infrastructure">
      <title>Make webhook payment updates atomic</title>
      <description>
        Stripe webhook handlers increment/decrement order.amountPaid non-atomically.
        Two concurrent webhooks (e.g., checkout.session.completed and
        payment_intent.succeeded for same payment) could race on the amount update.
        Dedup catches most cases but edge cases remain.
      </description>
      <steps>
        - Wrap payment creation + amountPaid update in Prisma $transaction
        - Use db.$transaction([create payment, update order]) for atomicity
        - Apply to checkout.session.completed, payment_intent.succeeded, and charge.refunded handlers
        - Verify D1/Prisma adapter supports $transaction (it does for sequential operations)
      </steps>
      <test_steps>
        1. Process normal payment webhook → payment created, amountPaid updated correctly
        2. Send duplicate webhook → dedup prevents double-counting
        3. Process refund → amountPaid decremented atomically
      </test_steps>
      <review></review>
    </task>

    <task id="invite-token-expiry" priority="3" category="functional">
      <title>Add invite token expiration</title>
      <description>
        Invite tokens never expire once created. An old invite link could be
        used months later. Should have a TTL (e.g., 7 days).
      </description>
      <steps>
        - Add expiresAt field to Invite model (DateTime, nullable for backwards compat)
        - Create migration: ALTER TABLE Invite ADD COLUMN expiresAt TEXT
        - Set expiresAt = now + 7 days in createInvite
        - Check expiration in acceptInvite: if (invite.expiresAt && invite.expiresAt < now) reject
        - Show expiration in admin team UI
      </steps>
      <test_steps>
        1. Create invite → expiresAt set to 7 days from now
        2. Accept invite within TTL → success
        3. Accept invite after TTL (mock time or set past date) → rejected
        4. Verify admin UI shows expiration date
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - All admin order functions verify org ownership (defense-in-depth)
    - WebAuthn counter decrease rejects login (cloning detection)
    - Challenges expire after 5 minutes
    - MANAGER_CODE removed, ADMIN_CODE one-time-use only
    - CSP prevents clickjacking via frame-ancestors
    - Market inputs validated for length
    - Webhook payment updates are atomic
    - Invite tokens expire after 7 days
  </success_criteria>
</project_specification>
