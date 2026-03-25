---
title: "Stripe Connect Payment Integration"
created: 2026-03-15
poured:
  - fresh-catch-mol-0um
  - fresh-catch-mol-2ue
  - fresh-catch-mol-s8d
  - fresh-catch-mol-kfm
  - fresh-catch-mol-7as
  - fresh-catch-mol-xdg
  - fresh-catch-mol-kzz
  - fresh-catch-mol-578
  - fresh-catch-mol-5by
  - fresh-catch-mol-b3t
  - fresh-catch-mol-ur8
  - fresh-catch-mol-ysh
  - fresh-catch-mol-np2
  - fresh-catch-mol-y39
  - fresh-catch-mol-816
  - fresh-catch-mol-ak7
  - fresh-catch-mol-50r
  - fresh-catch-mol-gn3
  - fresh-catch-mol-kuu
  - fresh-catch-mol-xpa
  - fresh-catch-mol-uc4
  - fresh-catch-mol-9rh
  - fresh-catch-mol-7gt
  - fresh-catch-mol-ukh4
  - fresh-catch-mol-9wdx
  - fresh-catch-mol-w689
  - fresh-catch-mol-n8tp
  - fresh-catch-mol-q9up
  - fresh-catch-mol-ayfb
  - fresh-catch-mol-ytiq
  - fresh-catch-mol-xu1q
  - fresh-catch-mol-fx11
  - fresh-catch-mol-xr66
  - fresh-catch-mol-zil0
  - fresh-catch-mol-2gx8
  - fresh-catch-mol-pqxz
  - fresh-catch-mol-u3ld
  - fresh-catch-mol-gi3j
  - fresh-catch-mol-8nrr
  - fresh-catch-mol-r986
  - fresh-catch-mol-fhad
  - fresh-catch-mol-05bn
  - fresh-catch-mol-qhuf
  - fresh-catch-mol-kgvl
  - fresh-catch-mol-rtr7
iteration: 1
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Stripe Connect Payment Integration</project_name>

  <overview>
    Add Stripe Connect payment processing to Fresh Catch's existing order system.
    Digital Glue is the platform, vendors (Evan) are Express connected accounts.
    Customers pay online via Stripe Checkout (Apple Pay / Google Pay / card) or
    offline (cash / venmo / zelle tracked manually). Platform takes configurable fee.
    Supports deposits, partial payments, and optional tipping.

    Decisions locked:
    - Fee model default: customer absorb (all 3 modes supported)
    - Fee rate: 5% default, configurable per org (platformFeeBps)
    - Deposit: org-wide default, admin can override per order
    - Stripe processing fee: vendor absorb
    - Stripe account: one Digital Glue account, metadata distinguishes platforms
    - Tipping: customer-optional at checkout, fee-exempt (no platform cut on tips)
    - Manual payments: still supported, recorded in Payment table
    - Connect account type: Express
    - Deposits: customer accepts double Stripe processing fee (deposit PI + remainder PI)
    - Platform fee calculated on order price only, NOT on tip amount
  </overview>

  <context>
    <existing_patterns>
      - RWSDK server component + client component + server function pattern
        - Page.tsx (async server component, fetches data, passes props)
        - UI.tsx ("use client", handles state, calls server functions)
        - functions.ts ("use server", uses requestInfo for ctx, returns {success, error?})
      - Server functions use `const { ctx } = requestInfo` for auth/org context
      - Admin access checked via `hasAdminAccess(ctx)` from src/utils/permissions.ts
      - Email: Resend + React Email templates in src/emails/, sent via src/utils/email.ts
      - Design system primitives imported from @/design-system (Button, Card, Container, etc.)
      - Semantic CSS tokens everywhere (var(--color-*), var(--space-*), etc.)
      - React useTransition() for loading states (not manual useState)
      - Routes: defineApp → prefix/layout/route in src/worker.tsx
      - DB: Prisma + D1 adapter, schema at prisma/schema.prisma, generated to generated/prisma/
      - Env/secrets in wrangler.jsonc vars, accessed via `import { env } from "cloudflare:workers"`
    </existing_patterns>

    <integration_points>
      - prisma/schema.prisma: Order model (add pricing/payment fields), Organization model (add Stripe fields), new Payment model
      - src/app/pages/orders/functions.ts: createOrder (no change), but new payment functions needed
      - src/app/pages/admin/order-functions.ts: confirmOrder (change price from string to cents, create PaymentIntent), markAsPaid (create Payment record)
      - src/app/pages/admin/AdminOrderCard.tsx: update confirm form (numeric price, deposit toggle, fee preview)
      - src/app/pages/orders/CustomerOrdersUI.tsx: add payment button, tip selector, price breakdown
      - src/utils/email.ts: add new email sending functions for payment events
      - src/emails/OrderConfirmed.tsx: update to include payment link and price breakdown
      - src/worker.tsx: add webhook route (raw body, no middleware)
      - wrangler.jsonc: add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET secrets
    </integration_points>

    <new_technologies>
      - Stripe on Cloudflare Workers: stripe-node v13+ works natively (current v17+)
        - Must use: Stripe.createFetchHttpClient() and Stripe.createSubtleCryptoProvider()
        - Webhook verify: constructEventAsync (NOT constructEvent), needs raw body as Buffer
      - Stripe Connect Express accounts: platform creates account, Stripe hosts onboarding/KYC
        - Account links are single-use, refresh_url generates new one
        - account.updated webhook signals onboarding complete (charges_enabled + details_submitted)
      - Stripe Checkout: redirect-based, handles all payment UI, Apple Pay/Google Pay included
        - Destination charges: application_fee_amount deducted from connected account
        - No native tip field — add tip as separate line item (NOT included in application_fee_amount)
        - Tips are fee-exempt: application_fee_amount calculated on order price only
      - Deposits: two separate PaymentIntents (deposit PI + remainder PI), linked via order ID
        - Customer pays Stripe processing fee twice (~$1.67 vs ~$1.03 on single charge) — accepted tradeoff
      - Packages needed: stripe (server), @stripe/stripe-js (client, for redirect)
    </new_technologies>

    <conventions>
      - File naming: PascalCase for components, camelCase for utils/functions
      - Component colocation: page components in src/app/pages/[feature]/components/
      - Server functions return { success: boolean, error?: string, data?: T }
      - All money stored as Int (cents) to avoid floating point
      - Route organization: feature routes in routes.ts, composed in worker.tsx
      - No JSON APIs for internal UI — server functions only. API routes only for external (webhooks)
      - pnpm as package manager
    </conventions>
  </context>

  <tasks>
    <task id="schema-migration" priority="0" category="infrastructure">
      <title>Database schema: pricing, Payment model, org Stripe fields</title>
      <description>
        Migrate Order.price from String? to Int? (cents). Add payment/pricing
        fields to Order. Create Payment model for tracking multiple payments
        per order. Add Stripe Connect and fee config fields to Organization.
        Handle data migration for existing orders.
      </description>
      <steps>
        - Create migration: Order model changes
          - price: String? → Int? (cents, e.g. 4500 = $45.00)
          - Add: tipAmount Int @default(0)
          - Add: platformFeeBps Int? (snapshot from org at confirm time, e.g. 500 = 5%)
          - Add: platformFee Int? (calculated cents)
          - Add: totalDue Int? (price + platformFee + tip)
          - Add: amountPaid Int @default(0)
          - Add: depositAmount Int? (null = no deposit required)
          - Add: stripeCheckoutSessionId String? (stored at confirm time, holds checkout URL)
          - Add: stripePaymentIntentId String? (populated by webhook after payment)
          - Keep paymentMethod, paymentNotes, paidAt (backward compat)
          - Remove paymentStatus column (derived from amountPaid/totalDue — see payment-status-sweep task)
        - Create Payment model
          - id String @id @default(uuid())
          - orderId String (FK to Order)
          - amount Int (cents)
          - method String (stripe | cash | venmo | zelle | other)
          - type String (deposit | payment | tip | refund)
          - stripePaymentId String?
          - notes String?
          - createdAt DateTime @default(now())
        - Organization model additions
          - stripeAccountId String?
          - stripeOnboardingComplete Boolean @default(false)
          - platformFeeBps Int @default(500)
          - defaultDepositBps Int? (e.g. 5000 = 50%, null = no deposit)
          - feeModel String @default("customer") // customer | vendor | split
        - Data migration: parse existing string prices to cents where possible
        - Add paymentStatus helper function (derived from amountPaid vs totalDue)
        - Run pnpm run migrate:dev, regenerate Prisma client
      </steps>
      <test_steps>
        1. Run pnpm run migrate:dev — no errors
        2. Run pnpm run generate — Prisma client regenerates
        3. Existing orders still load in admin and customer views
        4. New fields accessible in Prisma queries
        5. Payment model can be created/queried
      </test_steps>
      <review></review>
    </task>

    <task id="payment-status-sweep" priority="1" category="infrastructure">
      <title>Replace paymentStatus column with derived helper</title>
      <description>
        After schema-migration removes paymentStatus column, sweep all code that
        references it. Replace with derived helper function that computes status
        from amountPaid vs totalDue. Covers admin badges, customer UI, print view,
        filters, and any server functions that read/write paymentStatus.
      </description>
      <steps>
        - Create getPaymentStatus(order) helper in src/utils/payments.ts:
          - Returns: "unpaid" | "deposit" | "partial" | "paid" | "overpaid"
          - Logic: amountPaid == 0 → unpaid, amountPaid > 0 && < totalDue → partial/deposit, >= totalDue → paid
          - Handle null totalDue (unconfirmed orders) → return null
        - Grep for all paymentStatus references across codebase
        - Update AdminOrderCard.tsx: badge/status display → getPaymentStatus()
        - Update AdminOrdersUI.tsx: filter/sort by payment status → derived
        - Update CustomerOrdersUI.tsx: status display → getPaymentStatus()
        - Update PrintOrdersUI.tsx: payment status column → getPaymentStatus()
        - Update order-functions.ts: remove any direct paymentStatus writes
        - Update confirmOrder: no longer sets paymentStatus (totalDue drives it)
        - Update markAsPaid: no longer sets paymentStatus (amountPaid drives it)
        - Verify type safety: Prisma no longer exposes paymentStatus field
      </steps>
      <test_steps>
        1. pnpm run types — no paymentStatus type errors
        2. Admin order list shows correct status badges for all states
        3. Customer orders show correct payment status
        4. Print view renders payment status
        5. Filtering by payment status works in admin
        6. Unconfirmed orders (null totalDue) show no payment status
      </test_steps>
      <review></review>
    </task>

    <task id="stripe-setup" priority="0" category="infrastructure">
      <title>Stripe SDK setup and utility module</title>
      <description>
        Install stripe packages, create utility module for Workers-compatible
        Stripe client initialization, add env vars to wrangler config.
      </description>
      <steps>
        - pnpm add stripe @stripe/stripe-js
        - Create src/utils/stripe.ts with:
          - getStripe(env) — returns Workers-compatible Stripe client (fetchHttpClient)
          - getCryptoProvider() — SubtleCryptoProvider singleton for webhook verification
          - formatCents(cents) — display helper ($45.00)
          - parseDollars(input) — parse "$45.00" or "45" to 4500 cents
          - calculatePlatformFee(priceCents, feeBps, feeModel) — returns { customerTotal, vendorReceives, platformFee }
        - Add to wrangler.jsonc vars: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
        - Add STRIPE_PUBLISHABLE_KEY to client-accessible config if needed
      </steps>
      <test_steps>
        1. pnpm run dev starts without errors
        2. Stripe client initializes (log version or test API call)
        3. formatCents(4500) returns "$45.00"
        4. parseDollars("$45.50") returns 4550
        5. calculatePlatformFee(4500, 500, "customer") returns correct split
      </test_steps>
      <review></review>
    </task>

    <task id="vendor-onboarding" priority="1" category="functional">
      <title>Stripe Connect vendor onboarding flow</title>
      <description>
        Admin settings page for connecting Stripe account. Creates Express
        connected account, generates Stripe-hosted onboarding link, handles
        return and webhook for completion status.
      </description>
      <steps>
        - Create server functions in src/app/pages/admin/stripe-functions.ts:
          - createConnectedAccount(orgId) — creates Express account, stores stripeAccountId
          - getOnboardingLink(orgId) — generates accountLinks.create() URL
          - checkOnboardingStatus(orgId) — checks charges_enabled + details_submitted
        - Create admin settings page or section:
          - src/app/pages/admin/settings/StripeSettingsPage.tsx (server component)
          - src/app/pages/admin/settings/StripeSettingsUI.tsx (client component)
          - Shows: not connected → "Connect Stripe" button
          - Shows: pending → "Continue Setup" button + status
          - Shows: connected → green status, account info
        - Add route in admin routes: route("/settings/stripe", StripeSettingsPage)
        - Handle return_url: show success/pending message after Stripe redirect
        - Webhook handler for account.updated (in webhook task)
      </steps>
      <test_steps>
        1. Navigate to /admin/settings/stripe
        2. Click "Connect Stripe Account"
        3. Verify redirect to Stripe onboarding page
        4. Complete onboarding (test mode)
        5. Return to app — status shows connected
        6. Organization record has stripeAccountId populated
      </test_steps>
      <review></review>
    </task>

    <task id="webhook-endpoint" priority="1" category="infrastructure">
      <title>Stripe webhook endpoint</title>
      <description>
        Raw-body webhook route that verifies signatures and dispatches events.
        Handles payment success, failure, refunds, and account updates.
        Must bypass RWSDK's normal middleware (needs raw body, not parsed).
      </description>
      <steps>
        - Add API route in src/worker.tsx before the render() block
          - Match POST /api/stripe/webhook
          - Read raw body as ArrayBuffer → Buffer for signature verification
          - Use constructEventAsync with SubtleCryptoProvider
          - Return 200 on success, 400 on bad signature
        - Event handlers:
          - checkout.session.completed → look up order by metadata, create Payment record, update amountPaid
          - payment_intent.succeeded → backup handler (if checkout event missed)
          - charge.refunded → create Payment(type=refund), decrease amountPaid
          - account.updated → update org stripeOnboardingComplete
        - Add metadata to all PaymentIntents: { platform: "fresh-catch", orderId, orderNumber, orgId }
        - Log webhook events for debugging
      </steps>
      <test_steps>
        1. Use Stripe CLI: stripe listen --forward-to localhost:PORT/api/stripe/webhook
        2. Trigger test event: stripe trigger checkout.session.completed
        3. Verify 200 response and event logged
        4. Send invalid signature — verify 400 response
        5. Trigger payment_intent.succeeded — verify Payment record created
        6. Trigger account.updated — verify org onboarding status updated
      </test_steps>
      <review></review>
    </task>

    <task id="confirm-order-payment" priority="1" category="functional">
      <title>Update confirmOrder to create Stripe Checkout session</title>
      <description>
        When admin confirms an order with a numeric price, calculate platform
        fee, set totalDue, and create a Stripe Checkout session. Store session
        URL for customer payment. Support deposit mode.
      </description>
      <steps>
        - Update confirmOrder server function:
          - Accept price as number (cents) instead of string
          - Calculate platformFee using org's feeBps and feeModel
          - Calculate totalDue = price + platformFee (if customer absorb) or just price
          - Set depositAmount from org default (defaultDepositBps) or admin override
          - Create Stripe Checkout session:
            - Line item: order description + price
            - Line item (if fee visible): platform fee
            - application_fee_amount on payment_intent_data (calculated on order price only, NOT tip)
            - transfer_data.destination = org.stripeAccountId (tip flows to vendor, fee-exempt)
            - metadata: { orderId, orderNumber, orgId, platform: "fresh-catch" }
            - success_url: /orders?payment=success
            - cancel_url: /orders?payment=cancelled
          - If deposit mode: create session for depositAmount instead of totalDue
          - Store checkout session URL/ID on order
          - Update order: status=confirmed, price, platformFee, totalDue, depositAmount
        - Update AdminOrderCard confirm form:
          - Numeric price input (dollars.cents format, converts to cents)
          - Show calculated fee and customer total preview
          - Deposit toggle (default from org setting, overrideable)
          - Deposit amount field (if enabled)
        - Keep manual confirmation working if Stripe not connected (no stripeAccountId)
      </steps>
      <test_steps>
        1. Admin confirms order with price $45
        2. Platform fee calculated correctly (5% = $2.25)
        3. Customer total shows $47.25 (customer absorb mode)
        4. Stripe Checkout session created with correct amounts
        5. Order updated with all pricing fields
        6. Works without Stripe connected (graceful fallback)
        7. Deposit mode: session created for deposit amount only
      </test_steps>
      <review></review>
    </task>

    <task id="customer-payment-ui" priority="1" category="functional">
      <title>Customer order card: payment button, tip, price breakdown</title>
      <description>
        Update customer-facing order card to show price breakdown and payment
        actions. Add tip selector. "Pay" button redirects to Stripe Checkout.
        Show payment status, partial payment state, and deposit info.
      </description>
      <steps>
        - Create src/app/pages/orders/components/PriceBreakdown.tsx
          - Shows: Items price, platform fee, tip, total
          - Adapts display based on feeModel (show/hide fee line)
        - Create src/app/pages/orders/components/TipSelector.tsx
          - Preset buttons: $0, $5, $10, custom
          - Updates tip amount, recalculates total
        - Create src/app/pages/orders/components/PaymentActions.tsx
          - Confirmed + unpaid: "Pay $X" button (full) or "Pay $X deposit" + "Pay full $Y"
          - Confirmed + partial: "Pay remaining $X" button
          - Paid: green checkmark, amount paid
          - "or pay at pickup" text always visible
        - Add server function: createCheckoutSession(orderId, tipAmount)
          - Creates Stripe Checkout session with tip as separate line item
          - Returns checkout URL
          - Client redirects to Stripe
        - Update CustomerOrdersUI to pass pricing data to order cards
        - Handle return from Stripe (?payment=success or ?payment=cancelled)
          - Success: show confirmation toast/banner
          - Cancelled: show "payment cancelled" message
        - Derive payment status from amountPaid vs totalDue (no enum)
      </steps>
      <test_steps>
        1. Confirmed order shows price breakdown with fee
        2. Tip selector updates total in real-time
        3. "Pay" button redirects to Stripe Checkout
        4. Stripe Checkout shows correct amount with tip
        5. After payment: order shows as paid
        6. Deposit flow: "Pay deposit" and "Pay full" both work
        7. Partial payment: shows remaining amount
        8. "or pay at pickup" always visible
        9. Return from Stripe shows appropriate message
      </test_steps>
      <review></review>
    </task>

    <task id="admin-payment-management" priority="2" category="functional">
      <title>Admin: manual payment recording with Payment table</title>
      <description>
        Update admin payment management to create Payment records instead of
        updating flat fields. Show payment history on order card. Support
        recording partial payments. Updated derived payment status.
      </description>
      <steps>
        - Update markAsPaid in order-functions.ts:
          - Accept: orderId, amount (cents), method, notes
          - Create Payment record (type: "payment" or "deposit")
          - Update order.amountPaid (increment by payment amount)
          - If amountPaid >= totalDue: set paidAt
          - Remove direct paymentStatus update (derived now)
        - Update AdminOrderCard payment UI:
          - "Record Payment" button (replaces "Mark as Paid")
          - Amount field (defaults to remaining balance)
          - Method dropdown: cash, venmo, zelle, card, other
          - Notes field
          - "Record full payment" shortcut button
        - Add payment history section to AdminOrderCard:
          - List all Payment records for the order
          - Show: date, amount, method, type, notes
          - Total paid vs total due
        - Update admin order list to show derived payment status badges
        - Update print view to use derived payment status
      </steps>
      <test_steps>
        1. Record cash payment of $20 on $45 order → shows partial
        2. Record another $25 → order shows fully paid
        3. Payment history shows both records
        4. Print view shows correct payment status
        5. Admin order list badges reflect derived status
        6. Full payment shortcut records remaining balance
      </test_steps>
      <review></review>
    </task>

    <task id="fee-config" priority="2" category="functional">
      <title>Platform fee and deposit configuration UI</title>
      <description>
        Admin settings for configuring platform fee percentage, fee model
        (customer/vendor/split), and default deposit requirement. Preview
        calculator shows impact on a sample order.
      </description>
      <steps>
        - Add fee/deposit config to Stripe settings page (or separate section):
          - Fee percentage input (default 5%, stored as platformFeeBps)
          - Fee model selector: customer absorb / vendor absorb / split
          - Default deposit toggle + percentage (stored as defaultDepositBps)
        - Create server functions:
          - updateFeeConfig(orgId, feeBps, feeModel)
          - updateDepositConfig(orgId, depositBps)
        - Preview calculator component:
          - "On a $50 order:"
          - Customer pays: $52.50 / $50.00 / $51.25 (depending on model)
          - Vendor receives: $50.00 / $47.50 / $48.75
          - Platform fee: $2.50
          - Deposit required: $25.00 (if 50%)
        - Permissions: owner only (not just admin)
      </steps>
      <test_steps>
        1. Navigate to settings, see current fee config
        2. Change fee to 7% → preview updates
        3. Switch fee model → preview recalculates
        4. Enable deposit at 50% → preview shows deposit amount
        5. Save → new orders use updated config
        6. Non-owner admin cannot access fee settings
      </test_steps>
      <review></review>
    </task>

    <task id="email-updates" priority="2" category="functional">
      <title>Update email templates for payment flow</title>
      <description>
        Update OrderConfirmed email to include payment link and price breakdown.
        Add PaymentReceived email template. Ensure emails work with and without
        Stripe (manual payment scenarios).
      </description>
      <steps>
        - Update OrderConfirmed.tsx email template:
          - Add price breakdown section (items, fee, total)
          - Add "Pay Now" button linking to Stripe Checkout URL
          - Keep "or pay at pickup" text
          - Show deposit info if applicable
          - Graceful without Stripe (no pay button, just price)
        - Create PaymentReceived.tsx email template:
          - Sent on successful Stripe payment (from webhook handler)
          - Shows: order #, amount paid, remaining balance (if partial), payment method
          - Thank you message
        - Update webhook handler to send PaymentReceived email
        - Update email.ts with new sending functions
      </steps>
      <test_steps>
        1. Confirm order → customer email includes price breakdown and Pay Now button
        2. Pay Now link opens Stripe Checkout
        3. After payment → customer receives PaymentReceived email
        4. Deposit payment → email shows remaining balance
        5. Order without Stripe → email shows price but no Pay button
      </test_steps>
      <review></review>
    </task>

    <task id="update-existing-refs" priority="3" category="functional">
      <title>Update all existing price references from string to cents</title>
      <description>
        Find and update all code that reads/writes Order.price as a string.
        Use formatCents() helper for display. Update filters, sorting, and
        any price comparisons.
      </description>
      <steps>
        - Grep for all Order.price references across codebase
        - Update CustomerOrdersUI: display price using formatCents()
        - Update AdminOrderCard: display price using formatCents()
        - Update AdminOrdersUI: any price display/filtering
        - Update PrintOrdersUI: price display
        - Update "Order Again" flow if it references price
        - Update any sorting/filtering that uses price
        - Remove old string-based price display logic
        - Add formatCents to design-system or utils for shared use
      </steps>
      <test_steps>
        1. All order views display prices correctly ($45.00 format)
        2. Admin order list shows prices
        3. Print view shows prices
        4. No broken price references in any view
        5. Old orders with null price still display gracefully
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <deferred>
    - Itemized pricing: Evan lists items w/ individual prices, customer sees breakdown per item
    - Zelle/Venmo in-app: stays manual for now, recorded in Payment table
    - Auto-deposit rules: "always require 50% deposit on orders over $X"
    - Refund flow in-app: use Stripe dashboard, webhook updates status
    - Receipt/invoice generation: Stripe sends receipts automatically
    - Multiple vendors: foundation supports it (per-org stripeAccountId + fee), no multi-vendor UI yet
    - Stripe CLI dev setup: document local webhook testing workflow
  </deferred>

  <success_criteria>
    - Customer can pay for confirmed orders via Stripe Checkout (card, Apple Pay, Google Pay)
    - Admin can confirm orders with numeric price, system calculates fee and creates payment session
    - Deposits and partial payments tracked via Payment model
    - Manual payments (cash/venmo/zelle) still work, recorded in Payment table
    - Platform fee configurable per organization (customer/vendor/split models)
    - Vendor onboarding via Stripe Connect Express
    - Webhook handles payment events and updates order state automatically
    - All money stored as cents (Int), displayed with formatCents() helper
    - Works without Stripe connected (graceful fallback to manual-only)
    - Tipping supported at checkout
  </success_criteria>
</project_specification>
