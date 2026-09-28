# Fresh Catch — project handoff (rev 2)

A portable brief. Paste this into a new session, or upload it, and the work can continue without re-deriving anything.

Changes in rev 2 are marked **[new]**. Sections 1–4 are largely carried over; §3 is unchanged and still non-negotiable.

---

## 1. What this is

A mobile-first landing page for a single farmers market fish vendor. It replaces an existing dark-themed page at `market.digitalglue.dev`.

**The page has two jobs, in this order:**

1. Tell someone where the vendor is **today** (or next), with hours and directions.
2. Show what fish are available **this week**, with prices, and let someone ask to have one held.

Everything else is secondary. If a feature doesn't serve one of those two jobs, it goes below the fold or gets cut.

**Audience:** shoppers aged 60 and up. They are reading on a phone, outdoors, in daylight, often standing, frequently wearing reading glasses, sometimes with a bag in one hand. Many will arrive from a link a friend sent, not from search.

**The three questions the page must answer in under five seconds:** Where is he today? Is he open right now? What does he have?

---

## 2. Why the original page failed

Kept here so the same mistakes don't come back.

- Dark background. Worst possible choice for the use case. See §3.
- Body type around 16px; the only large type was the brand name, which nobody needs.
- Actions were inline underlined links roughly 20px tall, four of them reading identically as "Request this."
- No prices, no addresses, no phone number, no directions.
- Hours written as `Fridays 10-6`. Digit-hyphen-digit at small size is a legibility trap.
- The word "fresh" appeared three times in the top 200 pixels, and no actual date appeared anywhere, so nothing signalled that the listing was current.
- "Log in" and "My requests" in the header, implying an account is needed to buy fish.
- A "★ Saved" control with no explanation of what it saves or where it goes.

**[new] What the original got right, and was worth keeping:** the mint "LIVE at Adobe Ranch" banner. A single saturated band carrying the live status is the one idea from the old design that survives into version E — as the teal status strip. The old palette's sea-and-sunset feeling also survives, translated onto a light ground.

---

## 3. Accessibility rules (non-negotiable)

These are the floor for every version. A design that breaks one of these is wrong regardless of how it looks.

### Light background, always

No dark mode, no dark hero, no dark page. Phone screens in direct sun are already fighting ambient light; a dark ground makes the screen a mirror and leaves thin light strokes to compete with glare. Older eyes compound it: the lens yellows and scatters more light with age, so light-on-dark *halates* — the letters bloom and the counters fill in. Dark bands are fine as punctuation (a header bar, a status strip, a single closing section). The reading surface stays light.

### Type

| Element | Minimum |
|---|---|
| Body text | 19px (20px at ≥700px viewport) |
| Line height, body | 1.55 |
| Section headings | 25px |
| Prices, hours, any number the shopper acts on | 21px |
| Page's one big answer (today's market) | 32px+ |

- One typeface family per design. Two only if they are unmistakably different.
- Line length under 80 characters. Content column 34–36rem.
- No all-caps runs. Caps destroy word shape, which is a measurable cost for older readers.
- Tabular numerals (`font-variant-numeric: tabular-nums`) wherever prices or times stack.
- Prefer faces with a disambiguated zero and a distinguishable lowercase l.

### Contrast

- Body and small text: **7:1 minimum** (WCAG AAA), not 4.5:1. The 4.5 figure assumes normal vision and indoor light; neither holds here.
- Large text and graphic elements: 4.5:1 minimum.
- Check accent colors against their actual background before using them for text. A bright orange or yellow that looks bold usually fails on white and can only be used as a fill behind dark text.

### Targets and controls

- Every action is a **full-width** block, **58px minimum height**, with at least 11px between it and the next one. Not inline links.
- Each link's text must make sense read alone: "Request bass," never "Request this." Assume a screen reader is reading a list of links with no surrounding context.
- Unavailable items get real text ("Flounder is sold out"), not just a greyed-out style.
- Visible focus: 4px outline, 3px offset, in a color that contrasts against both the control and the page.
- Never encode meaning in color alone. "Open today" carries a text badge *and* a border change *and* a background change.

**[new] Two amendments, both earned during the version E critique loop:**

- **Split controls are permitted** where a row needs exactly two actions (directions and phone). A two-up control of 60px-tall halves at ~180px wide each is a larger target than the 58px full-width minimum implies, and it stops the page becoming a wall of identical stacked boxes. Do not extend this to three-up.
- **Short visible labels with full accessible names are permitted** on those split controls: visible "Directions", `aria-label="Directions to Mesa View"`. Screen reader users still get a self-describing link; sighted users have the market name 20px above it. The original rule was written to stop "Request this" — it was never meant to force the market name to appear eight times down one screen. The rule still binds anywhere the visible label would be the *only* name, as on the fish rows ("Request bass").

### Content rules

- Spell out times: "10am to 6pm." Never `10-6`.
- Put a real date on the fish list ("Week of September 8"). A date does more for trust than the word "fresh."
- Every market gets a tappable phone number and an address that opens the phone's maps app. For this audience these two outrank every other interactive element combined.
- No account required to see anything or to make a request. Login lives in the footer, if it exists at all.
- Active voice on every button, and the same verb all the way through a flow: a button that says "Request bass" leads to a confirmation that says "Requested."

### Technical floor

- `<meta name="viewport" content="width=device-width, initial-scale=1">` with no `user-scalable=no` and no `maximum-scale`. Pinch zoom must work.
- One `<h1>`, then `<h2>`, then `<h3>`. No skipped levels.
- No motion that the user didn't trigger. There is currently none in any version, so `prefers-reduced-motion` has nothing to suppress — keep it that way.
- Works with CSS only; JavaScript enhances the "open today" flag but the page reads correctly without it.

---

## 4. Content model and mock data

**Vendor:** Fresh Catch, Sam Ortiz.
**Phone:** (505) 555-0142 — *placeholder.*

### Fish (weekly list)

Each item: name, price per pound, one line of useful description, availability state.

| Fish | Price | Description |
|---|---|---|
| Bass | $14/lb | Whole, gutted and scaled. One fish feeds two people. |
| Catfish | $9/lb | Skinned fillets. Best fried or blackened. |
| Flounder | — | Sold out. Back next Friday. |
| Shark | $12/lb | Thick steaks, firm like swordfish. Good on the grill. |

The four fish names came from the original page. The descriptions there were rewritten, because they told the shopper nothing they could act on. **Prices are invented.** Flounder is marked sold out in all versions to demonstrate that state.

**[new] Price is an optional field.** The admin side captures the fish list from Sam's natural language and formats it to JSON, but does not currently capture prices. Version E's fish row is built so that an absent price degrades cleanly: the name, description and request action still read correctly with the price slot empty, and the row keeps its rhythm. Do not build anything that assumes a price exists.

### Markets (weekly route)

Each item: name, day, hours, address with a landmark, directions link, contact link.

| Market | Day | Hours | Where |
|---|---|---|---|
| Mesa View | Wednesday | 3pm to 7pm | Community center lot, west side |
| Adobe Ranch | Friday | 10am to 6pm | 4400 Adobe Ranch Road, north gate |
| Cottonwood Plaza | Saturday | 8am to 1pm | 210 Cottonwood Avenue, behind the bakery |
| Rio Alto | Sunday | 9am to 2pm | Rio Alto Park, north end near the bandstand |

Only **Adobe Ranch, Fridays 10-6** came from the original page. The other three markets, all addresses, and all landmarks are invented placeholders. Replace before launch.

### Behavior

**[new] Version E reads the clock, not just the calendar.** Earlier versions only knew the day, which meant they could not answer the second of the three five-second questions. E resolves four states:

- **Open now** — status strip teal, coral dot, "Closes in N hours."
- **Opens later today** — same strip, "Opens in N hours."
- **Closed today** — strip goes muted grey, dot goes square (never colour alone), "Back on Wednesday."
- **After close on a market day** — treated as closed, rolls forward to the next stop.

Day-of-week mapping: Sunday 0, Wednesday 3, Friday 5, Saturday 6. Each market carries numeric open/close hours alongside its display string.

### [new] Saved markets

Now a defined feature, not an open question. A shopper stars markets; starred markets pin to a band directly under the hero showing each one's next occurrence, so "when is he near me next" never requires scrolling the full route. The star is accompanied by the module heading and a "2 saved" count — the meaning is never carried by the star alone. Today's market, if saved, reads "Open today until 6pm" rather than repeating the hero verbatim.

The star toggle itself is not built. It needs the same §3 treatment: a 58px target, a text label that changes ("Save Mesa View" / "Saved, tap to remove"), and a decision on whether the state is per-device or per-account.

---

## 5. The built versions

A–D all meet §3 and differ in personality, not in floor. **[new] E is the current direction** and is the only one that differs in *structure*.

**A — Plain and large** (`fresh-catch-A-plain-and-large.html`) — the audit built straight. Atkinson Hyperlegible.

**B — Price board** (`fresh-catch-B-price-board.html`) — stall board on ice blue, dotted leaders, numerals as hero. Archivo.

**C — Week dial** (`fresh-catch-C-week-dial.html`) — seven-day strip, circular medallions, pill buttons. Nunito.

**D — Chevron** (`fresh-catch-D-chevron.html`) — angular, zero radius, heavy rules, fish-scale band. Chivo.

C and D share a layout and differ only in skin. That was the finding that prompted E.

### [new] E — Tideline (`fresh-catch-E-tideline.html`)

Single self-contained file, fonts inlined, ~110KB total, no network requests at all.

**Structure**, top to bottom: light brand bar → saturated teal status strip → shallow-water hero carrying the one big answer → saved markets band → fish price board on sand → route schedule on white → deep closing band → footer.

**Tokens:**
sand `#f6efe3` · paper `#ffffff` · shallow `#eaf5f3` · shallow line `#bcd9d6` · deep `#06282e` · sea `#0d4f5a` · muted `#3d4d50` · coral `#8e2609` · coral fill `#fb9a5e` · line `#d8cbb4`

Every text tone was checked numerically against every surface it actually sits on. The worst pairing on the page is 7.49:1. Coral fill only ever carries near-black text; coral text is the darker `#8e2609`.

**Colour discipline:** coral marks the fact you act on — the price, the day, the live dot, the "Here today" badge, the primary action on dark ground. Teal is structure. Sand and shallow are grounds. Nothing else gets an accent.

**Type:** two families, unmistakably different, both self-hosted as variable woff2 subset to latin.
- **Fraunces** — market names, section headings, wordmark. Gives the page its character; the earlier single-grotesk versions read as competent accessible templates with no personality.
- **Hanken Grotesk** — all body text, and *all numerals* including prices and hours, for tabular figures.

**Signature device:** a heavy 6px rule under each section heading with a 2px hairline below it, and the section's meta right-aligned on the heading baseline ("per pound", "4 stops", "2 saved"). Repeated three times; it is what makes the page read as printed matter rather than a stack of cards.

**Fish rows** are a two-column lockup: name, description and the request action on the left; price and a fish drawing stacked at the right. The whole row is the tappable target, with an `aria-label` carrying name and price and a visible "Request bass →".

**The drawings are filled silhouettes, not line art.** Line art was tried first and read as wobbly doodling at 104px. Each fish is identifiable by silhouette alone — bass by its spiny dorsal and deep body, catfish by its barbels, flounder by the flat oval with both eyes on one side, shark by the swept heterocercal tail and gill slits. They are `currentColor`, so the sold-out row's drawing greys out with the rest of its text for free. Decorative and `aria-hidden`; they carry no information the text doesn't.

**The wordmark is the words alone.** An earlier fish glyph beside it read as clip art and was cut. If a mark is ever wanted, commission one.

**[new] Both Google CDN and self-hosting are now solved** — §7's font concern is closed for E.

---

## 6. The process used to generate directions

Worth continuing for *new* directions, because it reliably produces a different starting point than the one I'd pick unprompted.

1. Generate a long random alphanumeric string with a shell command (`tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 96`).
2. Read it for structure rather than content: doubled characters, runs of a single case, digit density, clusters of confusable glyphs, recurring letterforms, mirroring, letters that share a shape family.
3. Translate the dominant structural pattern into a design axis.
4. Build it properly, and never mention the string in the output.

**[new] E was not made this way.** E came from a critique loop: render a screenshot, hand *only* the screenshot to a critic with no code and no history, ask it to name the aesthetic being attempted, imagine how a top studio would execute that aesthetic, list the biggest gaps, and score out of 10. Iterate until it scores itself high.

The loop ran thirteen rounds, 5 → 9. What it caught, in order: the button wall reading as template output; a double rule that looked like a mistake; three visually identical lists; surface alternation too subtle to perceive; no personality (fixed by the display face); heavy request boxes; wrapped two-line control labels. Roughly half those problems were invisible to me while writing the markup and obvious the moment the page was a picture.

Use the same critic prompt every round, and do not tell the critic what score you need.

**The loop's failure mode, which cost it two rounds of false confidence.** It scored itself 9/10 and was wrong; a cold re-read put it at 7.5. By round 10 it had stopped finding structural problems and started tuning spacing, which feels like convergence but is the critic going blind to what the designer has normalized. "No illustrations" and "the wordmark is clip art" were both true from round 1 and never scored, because they had been silently accepted as out of scope. A genuinely independent critic would have named them immediately.

Two practical lessons: have someone other than the designer score it, and treat "the remaining notes are all spacing" as evidence the critic has gone stale rather than evidence the work is done. The loop also missed a live CSS bug (see below) because half-scale screenshots hid it — inspect at full resolution before believing a score.

**A bug worth remembering.** The sold-out row is a `div` while the others are `<a>`. `:last-of-type` resolves per element type, so the sold-out row matched both `:first-of-type` and `:last-of-type` among divs and picked up the list's heavy closing rule mid-list. Related: `a.fish` out-specified `.fish` and silently killed the row's grid. Both are the same trap — styling rows by position or by bare class when the rows are not all the same element. E now uses explicit `.first` and `.last` classes.

---

## 7. Open and unresolved

- **~~"★ Saved" is undefined~~** — resolved, see §4. The star *toggle* still needs designing.
- **"My requests" / login** — a working app exists and this page should blend into it. Currently a footer link. The request flow still ends at call-or-text; if it becomes a form it needs §3 treatment and a confirmation that names what was requested.
- **~~Fonts load from Google's CDN~~** — resolved for E: self-hosted, inlined, zero network requests.
- **Prices in the admin flow.** The LLM captures the fish list but not prices. Either extend the prompt, or give Sam a plain numeric field per fish, or accept that E renders correctly without them.
- **Nothing has been tested on a real device in real sunlight**, which is the only test that matters here. Automated checks that *have* passed on E: one h1 with no skipped levels, no tap target under 44px, no horizontal overflow at any viewport from 195px to 430px (195px being the reflow equivalent of 200% browser zoom on a small phone), correct rendering with JavaScript disabled, viewport meta permits pinch zoom. Note that testing zoom via CSS `zoom` is a poor proxy — it does not trigger media queries, so it reports failures that real browser zoom would not. Test by narrowing the viewport instead. Still untested: an actual screen reader pass, one-handed reach, and sunlight.
- **Seasonality.** The admin side handles the weekly rewrite, so the date stamp is safe — provided someone confirms Sam actually does it each Monday. The page says "Sam sets the list each Monday"; that promise is now load-bearing.
- **[new] The four market names, all addresses, and all prices are still placeholders.**
- **[new] The fish drawings cover exactly these four species.** Anything Sam adds through the admin flow has no drawing. The row is built to survive that — it just renders without one — but if the list rotates seasonally, someone needs to decide whether to draw more or drop the drawings entirely rather than ship a half-illustrated list.

---

## 8. If you only remember five things

1. Light background. The dark page was the single biggest problem.
2. 19px body, 58px targets, 7:1 contrast — verified numerically, not by eye.
3. Lead with today's market and whether he is open *right now*, not the brand.
4. Every action reachable in one tap; every market one tap from directions and a phone call.
5. Put a date on it.
