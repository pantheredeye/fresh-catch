# Chat UX Overhaul: Human-First with AI Quick Actions

## Poured Beads
- `fresh-catch-mol-6ozfp` — Phase 1: Human-first chat + vendor presence (P0)
- `fresh-catch-mol-ecclf` — Phase 2: Quick action chips with direct tool execution (P1)
- `fresh-catch-mol-6f704` — Phase 3: Ask AI opt-in with guardrails (P2)
- `fresh-catch-mol-6ltrx` — Phase 4: Email notification overhaul (P1)

## Context

Every customer message currently gets auto-intercepted by AI when the vendor is offline. Customers think they're talking to the human (Evan) and get confused/frustrated by AI responses. The email notification after vendor replies fires too aggressively (5-min debounce = email per message burst). The overall experience needs to shift from "AI-first chat" to "human chat with AI assist on tap."

## Architecture Change

**Current:** customer msg → if vendor offline → AI agent parses every message → auto-replies
**New:** customer msg → always goes to vendor. Quick action chips let customer explicitly invoke AI tools. "Ask AI" is an opt-in free-text mode.

---

## Phase 1: Human-First + Presence Indicator

Remove auto-AI. Surface vendor online/offline state.

### `src/chat/durableObject.ts`
- **Delete** lines 256-263 (the `if customer + vendor offline + no takeover → handleAiResponse()` block)
- Keep `handleAiResponse` method — reused in Phase 3
- Add `vendorOnline` to the `history` WebSocket payload (line ~106) so client has presence on connect without waiting for a separate event

### `src/app/pages/home/components/ChatSheet.tsx`
- Add `vendorOnline` state (default `null` = unknown)
- Handle `"vendor-presence"` in WebSocket message listener (data already sent by DO)
- Also read `vendorOnline` from history payload on connect
- Show subtle status bar below header when vendor offline:
  - `"{vendorName} is away"` — muted text, `--color-surface-secondary` bg
  - Collapses to a small dot indicator when vendor comes online: green dot + `"Online"`
- Update empty-state placeholder: `"Message {vendorName} — they'll see it when they're back online"` when offline

---

## Phase 2: Quick Action Chips

Always-visible tool shortcuts above the input area.

### New: `src/app/pages/home/components/ChatQuickActions.tsx`
Horizontal-scroll chip bar. Actions:
| Label | Tool | Args |
|-------|------|------|
| "What's fresh?" | `list_catch` | `{}` |
| "Market schedule" | `get_markets` | `{ activeOnly: true }` |
| "Upcoming popups" | `get_vendor_popups` | `{}` |
| "Place an order" | direct link to `/orders/new` (no AI) |
| "Ask AI" | toggles AI input mode (Phase 3) |

For Phase 2, first three + "Place an order" (just a link) are wired. "Ask AI" deferred to Phase 3.

**Style:** pill buttons, `--color-surface-secondary` bg, `--color-text-primary` text, `--radius-full`, horizontal scroll with `scrollbar-width: none`. Pressed state: `--color-action-primary` bg, `--color-text-inverse` text.

### `src/chat/durableObject.ts`
New handler in `webSocketMessage` for `type: "ai-action"`:
```ts
interface AiActionMessage {
  type: "ai-action";
  tool: string;
  args: Record<string, unknown>;
}
```
Flow:
1. Validate tool name against allowed customer tools
2. Budget check via McpDO (reuse existing pattern from `handleAiResponse`)
3. Call tool handler directly (e.g., `handleListCatch(args, orgId, "customer")`)
4. Format result text (new formatter — see below)
5. Persist as `senderType: "ai"` message
6. Broadcast to all sockets

### New: `src/chat/tool-formatter.ts`
Simple template-based formatter per tool. Converts raw JSON tool results into readable chat text. No LLM call needed.
- `list_catch` → "Here's what's fresh:\n• Mahi — $12/lb, caught this morning\n• ..."
- `get_markets` → "Market schedule:\n• Adobe Ranch — Saturdays 8am-12pm\n• ..."
- `get_vendor_popups` → "Upcoming popups:\n• Spring Festival — April 15\n• ..."

### `src/app/pages/home/components/ChatSheet.tsx`
- Render `<ChatQuickActions>` between message area and input form
- On chip tap: send `{ type: "ai-action", tool, args }` via WebSocket
- Also insert an optimistic customer-style message ("What's fresh today?") so the thread reads naturally

---

## Phase 3: "Ask AI" + Order Flow

### `src/app/pages/home/components/ChatSheet.tsx`
- Add `aiMode` state toggle. When "Ask AI" chip tapped:
  - Show dismissible pill above input: "Asking AI — tap X to return to chat"
  - Change placeholder: "Ask about seafood, markets, orders..."
  - Send button routes to `{ type: "ai-query", content }` instead of `{ type: "message" }`
- "Place an order" chip: opens AI mode with pre-filled context prompt

### `src/chat/durableObject.ts`
New handler for `type: "ai-query"`:
1. Persist customer message as `senderType: "customer"`
2. Run through `generateAiResponse()` (existing ai-agent.ts) with modified system prompt
3. Add guardrail to system prompt: "Only answer questions about seafood, this vendor's products, markets, and orders. Politely decline off-topic requests."
4. Persist + broadcast AI response

### `src/chat/ai-agent.ts`
- Add optional `guardrail` param to `generateAiResponse` options
- When set, prepend guardrail instruction to system prompt

---

## Phase 4: Email Notification Overhaul

Two sub-problems: (A) email fires too often, (B) email collection UX is intrusive.

### A. Batch notifications with DO alarms

#### `src/chat/durableObject.ts`
Replace the current debounce-per-message approach with alarm-based batching:

1. When vendor sends message + customer offline:
   - Append message preview to `pendingEmailMessages` array in DO storage
   - If no alarm set, schedule DO alarm for 15 minutes
2. `alarm()` method:
   - Read `pendingEmailMessages` from storage
   - If any, send single batched email: "{vendorName} sent you {count} message(s)"
   - Clear storage + alarm state
3. If customer comes back online (WebSocket connects) before alarm fires:
   - Cancel alarm, clear `pendingEmailMessages` — no email needed

This means a burst of 10 vendor messages = 1 email 15 minutes later (or 0 if customer returns first).

#### `src/emails/ChatReplyNotification.tsx`
Add `messageCount` prop. When > 1: "Evan sent you 3 messages" subject, show latest preview + "and 2 more messages" in body.

### B. Smoother email collection

#### `src/app/pages/home/components/ChatSheet.tsx`
Replace `EmailPromptBubble` with integrated away-notice flow:
- When vendor is away + customer hasn't provided email, the away bar expands to include an inline email field:
  > "Evan is away. Get notified when they reply?"
  > `[your@email.com] [Notify me]`
- After submission, collapses to: "We'll email you when Evan replies"
- This is contextual and non-intrusive — it's part of the status bar, not a chat bubble

#### Delete: `src/app/pages/home/components/EmailPromptBubble.tsx`
No longer needed after integration into away notice.

---

## Phasing & Ship Order

```
Phase 1 → ship immediately (removes confusion, zero new features)
Phase 2 → ship next (biggest UX win, direct tool invocation)
Phase 4A → can run in parallel with Phase 2 (DO alarm, independent)
Phase 3 → after Phase 2 (builds on chip UI)
Phase 4B → after Phase 1 (needs away bar)
```

## Verification

- **Phase 1**: Open chat as logged-out user, send message. Should NOT get AI auto-reply. Should see "away" indicator if vendor not in admin chat.
- **Phase 2**: Tap "What's fresh?" chip. Should see formatted catch data as AI message. No LLM call — direct tool execution.
- **Phase 3**: Tap "Ask AI", type "when is the next market?". Should get AI response. Type "write me a poem" → should get polite decline.
- **Phase 4**: Send messages as customer, go offline. Vendor replies 5 times in 10 minutes. Customer should get exactly 1 email ~15 min after first vendor reply.

## Decisions Made

- **Quick actions always visible** — vendor takeover does NOT suppress them. "What's fresh?" is useful even during active vendor conversation.
- **"Place an order" = direct link** to `/orders/new`, not an AI flow. Simple, no ambiguity.
- **No toast/snackbar** — toast is bad UX for this context. Use inline notices within the chat sheet instead (e.g., unread indicator in the bottom nav badge, away bar in the sheet itself).
