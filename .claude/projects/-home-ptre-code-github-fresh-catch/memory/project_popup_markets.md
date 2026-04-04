---
name: Popup market type planning
description: Plans for popup/temporary market type with expiration and archive feed
type: project
---

Markets will have types: "regular" (recurring, permanent) and "popup" (temporary, expires).

**Popups:**
- Have an expiration date
- After expiration: disappear from active view, archive into a feed of past popups
- May share same fields as regular markets, TBD
- Voice creation is ideal — "Hey I'm doing a popup at Shem Creek this Thursday 4 to 7"

**How to apply:** When implementing market types, add a `type` field (regular/popup) and `expiresAt` (nullable datetime). Design the archive/feed for expired popups. Keep voice-to-market extraction aware of both types.
