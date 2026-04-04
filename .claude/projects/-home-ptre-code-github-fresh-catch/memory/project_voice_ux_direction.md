---
name: Voice UX product direction
description: Product decisions on voice-driven features, unified commands, and UX philosophy for admin tools
type: project
---

Voice-to-X is the preferred admin input pattern. Already live for catch updates, planned for market creation/updates.

**UX philosophy:** Each feature page has its own clear action (big mic button). Users understand this because it's "normal enough, then a step beyond." Don't make a unified voice command the primary interface — it can be secondary/tertiary but shouldn't block direct actions.

**Why:** Users are comfortable with phone-native interaction. Go to page → see clear action → press it. Over time the bar for "normal" rises and users may learn to speak/type freely, but that's emergent, not forced.

**How to apply:** When building new admin features, default to dedicated voice entry points per feature page. Don't build a single omniscient voice assistant. Keep form fallbacks (type toggle) for all voice features.
