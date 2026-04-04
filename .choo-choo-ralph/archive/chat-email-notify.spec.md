---
title: "Chat Email Notifications"
created: 2026-04-03
poured:
  - fresh-catch-mol-il8d
  - fresh-catch-mol-euq6
  - fresh-catch-mol-0qfo
  - fresh-catch-mol-chwe
  - fresh-catch-mol-l771
  - fresh-catch-mol-vi94
  - fresh-catch-mol-fxbh
  - fresh-catch-mol-sy9f
  - fresh-catch-mol-vmsa
  - fresh-catch-mol-ml3j
  - fresh-catch-mol-mi44
iteration: 2
auto_discovery: false
auto_learnings: false
---
<project_specification>
<project_name>Chat Email Notifications</project_name>

  <overview>
    Anonymous customers can chat with vendors via the ChatSheet bottom sheet. After a vendor replies, softly prompt the customer for their email — "Want to know when Evan replies?" — so they get a notification email if they close the tab. Low friction, dismissable, warm fish-market tone. Also fixes a pre-existing message format mismatch that prevents all chat messaging from working.
  </overview>

  <context>
    <existing_patterns>
      - Chat uses WebSocket via ChatDurableObject (src/chat/durableObject.ts) for real-time messaging
      - Anonymous auth: conversation UUID acts as bearer token (no ctx.user needed)
      - Email: Resend client with lazy init in src/utils/email.ts, react-email templates in src/emails/
      - Email pattern: render react-email component to HTML, pass to sendEmail(), skip silently in dev without API key
      - Server functions in src/chat/functions.ts use "use server" directive with requestInfo for context
      - NamePrompt stores conversationId in localStorage keyed by `fresh-catch-chat-${organizationId}`
      - ChatSheet is a bottom sheet with peek/full states, WebSocket lifecycle, message list with auto-scroll
      - BottomNavigation.v2.tsx polls unread count every 30s when chat is closed
    </existing_patterns>
    <integration_points>
      - src/chat/durableObject.ts — add WebSocket tagging by role, offline detection, email trigger
      - src/chat/functions.ts — add saveCustomerEmail server function
      - src/app/pages/home/components/ChatSheet.tsx — fix message format, add email prompt trigger
      - src/app/pages/home/components/BottomNavigation.v2.tsx — already fixed to use per-conversation unread
      - src/worker.tsx — append role param when forwarding to DO
      - src/utils/email.ts — add sendChatReplyNotificationEmail helper
      - prisma/schema.prisma — add customerEmail to Conversation model
    </integration_points>
    <new_technologies>
      - Cloudflare DO WebSocket tags: this.ctx.acceptWebSocket(server, ["customer"]) enables this.ctx.getWebSockets("customer") filtering
      - Already using Resend + react-email — no new tech needed
    </new_technologies>
    <conventions>
      - Server functions: "use server" at top of file, use requestInfo for ctx
      - Email helpers: async function that renders template then calls sendEmail()
      - Components: "use client" directive, inline styles with design tokens
      - Design tokens: var(--color-*), var(--space-*), var(--radius-*), var(--font-size-*)
      - Page components live in src/app/pages/[feature]/components/
    </conventions>
  </context>

  <tasks>
    <task id="fix-message-format" priority="0" category="functional">
      <title>Fix WebSocket message format mismatch</title>
      <description>
        Pre-existing bug: all 3 chat clients (ChatSheet, MessagesUI, ChatThread) send type: "message" but the DO expects type: "send". Customer ChatSheet also omits senderType. Chat messaging is completely broken — messages get rejected as invalid format. Must fix before any other chat work.
      </description>
      <steps>
        - In src/chat/durableObject.ts line 93, change `parsed.type !== "send"` to `parsed.type !== "message"` to match what all clients send
        - Update the SendMessage interface in durableObject.ts to use type: "message" instead of type: "send"
        - In src/app/pages/home/components/ChatSheet.tsx line 236, change `{ type: "message", content: text }` to `{ type: "message", content: text, senderType: "customer" }` so the DO knows who sent it
        - Verify admin clients (MessagesUI.tsx:385, ChatThread.tsx:149) already include senderType: "vendor" — they do, no change needed
        - Fix message echo: in durableObject.ts webSocketMessage(), remove the `if (socket !== ws)` filter so the DO broadcasts to ALL connected sockets including the sender. Currently sent messages visually vanish because neither client adds optimistic messages and the DO skips the sender. Echoing from DO keeps truth in one place.
      </steps>
      <test_steps>
        1. Open /v/evan, tap Chat, enter name to create conversation
        2. Type a message and hit send
        3. Verify message appears in the chat (no "Invalid message format" error in DO logs)
        4. Open admin chat panel — send a vendor reply
        5. Verify vendor message appears in customer ChatSheet in real time
        6. Verify customer message appears in admin panel in real time
      </test_steps>
      <review></review>
    </task>

    <task id="schema-customer-email" priority="1" category="infrastructure">
      <title>Add customerEmail to Conversation schema</title>
      <description>
        Add an optional customerEmail field to the Conversation model so we can store the email for reply notifications. This is on the Conversation (not User) because anonymous customers may use different emails across conversations.
      </description>
      <steps>
        - Add `customerEmail String?` to Conversation model in prisma/schema.prisma
        - Create migration with pnpm run migrate:new
        - Apply with pnpm run migrate:dev
        - Run pnpm run generate to update Prisma client
      </steps>
      <test_steps>
        1. Run pnpm run migrate:dev — verify migration applies cleanly
        2. Run pnpm run generate — verify Prisma client regenerates
        3. Run pnpm run types — verify no type errors
      </test_steps>
      <review></review>
    </task>

    <task id="save-email-function" priority="1" category="functional">
      <title>Add saveCustomerEmail server function</title>
      <description>
        Server function to save an email address on an anonymous conversation. Uses conversation ID as bearer token — no additional auth needed beyond knowing the ID.
      </description>
      <steps>
        - Add exported async function saveCustomerEmail(conversationId: string, email: string) to src/chat/functions.ts
        - Basic email format validation (regex, not strict — low-stakes capture)
        - Verify conversation exists
        - Update conversation.customerEmail
        - Return { success: true }
      </steps>
      <test_steps>
        1. Create a conversation via NamePrompt
        2. Call saveCustomerEmail with valid email — verify it returns success
        3. Query conversation in DB — verify customerEmail is set
        4. Call with invalid email — verify it rejects
        5. Call with non-existent conversationId — verify it handles gracefully
      </test_steps>
      <review></review>
    </task>

    <task id="email-template" priority="1" category="functional">
      <title>Create chat reply notification email template</title>
      <description>
        React-email template for notifying a customer that the vendor replied to their chat message. Warm, personal tone — "Evan from Fresh Catch replied to your message". Includes message preview and link back to the conversation.
      </description>
      <steps>
        - Create src/emails/ChatReplyNotification.tsx following existing template patterns (OrderConfirmation.tsx)
        - Props: customerName, vendorName, messagePreview, chatUrl, businessName
        - Subject line: "{vendorName} from {businessName} replied to your message"
        - Body: greeting, quoted message preview, CTA button "Continue the conversation"
        - Link must be absolute URL (e.g. https://market.digitalglue.dev/v/evan?chat={conversationId}) — emails can't use relative paths
        - The app domain should come from an env var (e.g. APP_URL) or be derived from the org's known domain
        - Add sendChatReplyNotificationEmail() to src/utils/email.ts following existing helper pattern
      </steps>
      <test_steps>
        1. Import template in a test script, render with sample data
        2. Verify HTML output contains customer name, vendor name, message preview
        3. Verify CTA link includes correct chat URL
        4. Visually inspect email in react-email preview if available
      </test_steps>
      <review></review>
    </task>

    <task id="email-prompt-bubble" priority="1" category="functional">
      <title>Create EmailPromptBubble component</title>
      <description>
        Inline card rendered in the chat message list after the first vendor reply. Non-blocking, dismissable, warm tone. "Want to know when Evan replies?" with email input and submit button.
      </description>
      <steps>
        - Create src/app/pages/home/components/EmailPromptBubble.tsx ("use client")
        - Props: conversationId, vendorName, onDismiss, onSubmitted(email)
        - UI: card with subtle background (var(--color-surface-secondary)), matching chat bubble radius
        - Email input + "Notify me" button + "No thanks" dismiss link
        - On submit: call saveCustomerEmail, then onSubmitted callback
        - Loading/error states
        - Export from components/index.ts
      </steps>
      <test_steps>
        1. Render component in isolation — verify layout matches chat bubble style
        2. Enter email, tap "Notify me" — verify saveCustomerEmail is called
        3. Tap "No thanks" — verify onDismiss is called
        4. Submit with empty/invalid email — verify validation feedback
      </test_steps>
      <review></review>
    </task>

    <task id="chatsheet-integration" priority="2" category="functional">
      <title>Integrate email prompt into ChatSheet</title>
      <description>
        Wire the EmailPromptBubble into the ChatSheet message list. Show it once after the first vendor message arrives. Persist dismiss/submit state in localStorage so it never reappears.
      </description>
      <steps>
        - Add state: emailPromptState ("pending" | "shown" | "submitted" | "dismissed")
        - Add state: submittedEmail (string | null) for confirmation display
        - On mount: check localStorage key `fresh-catch-email-prompt-${conversationId}` to restore state
        - In WebSocket message handler: when vendor message arrives and state is "pending", transition to "shown"
        - Render EmailPromptBubble inline in message list (after messages, before messagesEndRef) when state is "shown"
        - Render small confirmation text when state is "submitted"
        - On dismiss/submit: persist to localStorage
        - Thread vendorName prop through the full chain: CustomerHome.tsx (server, already has vendorName) → CustomerHomeUI (client) → BottomNavigation → ChatSheet. Add vendorName prop at each level.
      </steps>
      <test_steps>
        1. Open chat as customer, send a message
        2. Have vendor reply — verify email prompt appears inline
        3. Dismiss with "No thanks" — verify prompt disappears
        4. Close and reopen chat — verify prompt does NOT reappear
        5. Clear localStorage, reopen chat — verify prompt reappears after vendor message
        6. Submit email — verify confirmation text shows
        7. Verify message list still scrolls and functions normally with prompt present
      </test_steps>
      <review></review>
    </task>

    <task id="websocket-role-tagging" priority="2" category="functional">
      <title>Tag WebSocket connections by role</title>
      <description>
        Tag WebSocket connections as "customer" or "vendor" so the DO can detect when a customer is offline. Uses Cloudflare DO WebSocket tags.
      </description>
      <steps>
        - In src/worker.tsx WebSocket handler (~line 220): determine role from auth context (hasAdminAccess → "vendor", else → "customer"), append ?role= to URL before forwarding to DO
        - In src/chat/durableObject.ts fetch(): parse role from URL query params, call this.ctx.acceptWebSocket(server, [role]) instead of this.ctx.acceptWebSocket(server)
      </steps>
      <test_steps>
        1. Open customer chat — verify WebSocket connects successfully (no regression)
        2. Open admin chat — verify WebSocket connects successfully
        3. In DO logs or debugging: verify sockets are tagged correctly
      </test_steps>
      <review></review>
    </task>

    <task id="offline-email-trigger" priority="2" category="functional">
      <title>Trigger notification email when customer is offline</title>
      <description>
        When a vendor sends a message and no customer WebSocket is connected, send a notification email if the conversation has a customerEmail. Debounce to avoid spam.
      </description>
      <steps>
        - In src/chat/durableObject.ts webSocketMessage(): after persisting a vendor message, check this.ctx.getWebSockets("customer").length
        - If 0 customer sockets: look up conversation.customerEmail from DB
        - If email exists: check debounce (lastEmailSentAt in transient class field, 5min threshold)
        - If not debounced: query conversation.organization for name/slug, call sendChatReplyNotificationEmail()
        - Store lastEmailSentAt = Date.now() on successful send (transient class field — resets on DO eviction, acceptable for best-effort notifications)
        - Import setupDb and email utility in DO (already has access to env)
        - Risk: email.ts uses `import { env } from 'cloudflare:workers'` — should work in DO context since same worker bundle, but verify during implementation. Fallback: DO calls internal API endpoint for email sending.
      </steps>
      <test_steps>
        1. Customer submits email via prompt, then closes chat tab
        2. Vendor sends a message from admin panel
        3. Verify notification email is sent (check Resend dashboard or logs)
        4. Vendor sends another message within 5min — verify NO second email
        5. Wait 5min, vendor sends again — verify second email IS sent
        6. Customer has chat open (WebSocket connected) — vendor sends — verify NO email
      </test_steps>
      <review></review>
    </task>

    <task id="chat-resume-url" priority="3" category="functional">
      <title>Support chat resume via URL parameter</title>
      <description>
        When customer clicks the email notification link (/v/evan?chat={conversationId}), auto-open the ChatSheet and resume the conversation without showing NamePrompt.
      </description>
      <steps>
        - Read ?chat= query parameter in CustomerHome.tsx (server component) — client components can't access request URL directly
        - Pass chatConversationId as prop through: CustomerHome → CustomerHomeUI → BottomNavigation
        - In BottomNavigation: if chatConversationId is present, store in localStorage (same key as NamePrompt uses) and auto-open ChatSheet on mount
        - ChatSheet will find conversationId in localStorage and skip NamePrompt
      </steps>
      <test_steps>
        1. Navigate to /v/evan?chat={valid-conversation-id}
        2. Verify ChatSheet opens automatically
        3. Verify NamePrompt is skipped — goes straight to message thread
        4. Verify messages from previous conversation are loaded
        5. Navigate to /v/evan?chat={invalid-id} — verify graceful fallback
      </test_steps>
      <review></review>
    </task>
  </tasks>

  <success_criteria>
    - Chat messaging works end-to-end (customer and admin, both directions)
    - Email prompt appears once after first vendor reply, is dismissable
    - Customer receives email notification when offline and vendor replies
    - Email contains link that resumes the conversation seamlessly
    - No regressions to admin chat functionality
    - No email spam (debounce works)
  </success_criteria>
</project_specification>
