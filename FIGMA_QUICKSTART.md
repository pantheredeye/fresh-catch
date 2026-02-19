# Figma Quickstart Checklist

Use this to get tokens into Figma and start auditing in 30 minutes.

## Step 1: Figma Setup (5 min)

- [ ] Open Figma (or create new file)
- [ ] Install "Tokens Studio for Figma" plugin
- [ ] Open plugin (Resources → Plugins → Tokens Studio)

## Step 2: Import Tokens (5 min)

- [ ] In plugin → Settings (gear icon)
- [ ] Import → Load from JSON
- [ ] Copy contents of `src/design-system/tokens-three-tier.json`
- [ ] Paste and click Import
- [ ] Verify you see: brand, alias, component, dark token sets

## Step 3: Sync to Figma Variables (2 min)

- [ ] In plugin → Settings → Sync to Figma Variables
- [ ] Select all token sets
- [ ] Click Sync
- [ ] Verify: Right panel → Variables tab shows your tokens

## Step 4: Build First Component (10 min)

### Button Component

- [ ] Create new frame: "Components / Button"
- [ ] Draw rectangle (R key)
- [ ] Select rectangle → Right panel → Fill
- [ ] Click Fill color → Variables → `component/button/primary/background`
- [ ] Add text layer
- [ ] Select text → Variables → Font size: `component/button/primary/fontSize`
- [ ] Text color: `component/button/primary/text`
- [ ] Add auto layout (Shift+A)
- [ ] Horizontal padding: `component/button/primary/padding-x`
- [ ] Vertical padding: `component/button/primary/padding-y`
- [ ] Corner radius: `component/button/primary/borderRadius`
- [ ] Create component (⌥⌘K / Ctrl+Alt+K)

### Test Dark Mode

- [ ] Duplicate button instance
- [ ] Right panel → Variables → Change theme to "Dark Mode"
- [ ] See colors auto-update!

## Step 5: Build First Screen (15 min)

Pick easiest screen to start:

### Option A: Customer Home (Recommended)
- [ ] Create frame: "Screens / Customer Home"
- [ ] Set background: `component/page/background`
- [ ] Add your button component instances
- [ ] Add spacing between elements: `alias/spacing/lg`
- [ ] Toggle dark mode → check for issues

### Option B: Admin Dashboard
- [ ] Create frame: "Screens / Admin Dashboard"
- [ ] Set background: `component/page/background`
- [ ] Layout admin cards with `alias/spacing/md` gaps
- [ ] Toggle dark mode

## Step 6: Document First Issue (5 min)

You'll likely find something like:

- [ ] "Need --soft-gray token" (used in admin but not in JSON)
- [ ] "Button padding feels wrong"
- [ ] "Card border invisible in dark mode"

Write it down! This is gold.

## What You'll See

### In Tokens Studio Plugin

**Brand tokens** (raw values):
- blue-500: #0066CC
- spacing-3: 20px
- fontSize-md: 16px

**Alias tokens** (semantic):
- color-action-primary → blue-500
- spacing-md → spacing-3

**Component tokens** (applied):
- button-primary-background → color-action-primary
- button-primary-padding-x → spacing-md

### In Figma Variables Panel

All tokens converted to native Figma variables. Can use in:
- Fill colors
- Stroke colors
- Text properties
- Spacing (auto layout)
- Corner radius
- Effects (shadows coming soon in Figma)

### Theme Switching

Top of variables panel: "Light Mode" dropdown
- Switch to "Dark Mode"
- Components using theme-aware tokens auto-update!

## Common First Issues

### "I can't find the token I want"

**Problem**: Need `--soft-gray` but it's not in JSON

**Solution**:
1. Add to `tokens-three-tier.json` → brand layer
2. Re-import to Figma
3. Token now available

### "Component doesn't change in dark mode"

**Cause**: Used brand token instead of alias

**Example**:
```
❌ Fill: brand/color/neutral/white (always white)
✅ Fill: alias/surface/primary (adapts)
```

### "Too many tokens, overwhelming"

**Start small**:
1. Use component tokens only (highest level)
2. Let them reference alias automatically
3. Don't worry about brand tokens yet

## Next Steps After Quickstart

Once you have tokens in Figma:

1. **Build all components** from inventory (Button, Input, Card, Badge, etc)
2. **Build all screens** (Home, Admin, Orders)
3. **Toggle dark mode on each screen** → screenshot issues
4. **Update JSON** with missing tokens
5. **Fix code** based on Figma reference

Full workflow in `FIGMA_WORKFLOW.md`.

## Pro Tips

### Tip 1: Use Figma Dev Mode
- Enable Dev Mode (bottom right)
- Select element
- Right panel shows all applied tokens
- Perfect spec for devs

### Tip 2: Create Component Variants
- Button → Create variants (primary, secondary, ghost)
- Each variant uses different component tokens
- Switch variants instantly

### Tip 3: Document Tokens in Figma
- Create "Design System / Tokens" page
- Show all colors in grid
- Show spacing scale visually
- Show typography scale
- Share with team

### Tip 4: Export Designs with Token Names
- Screenshot component
- Annotate with token names
- Developers know exactly what to use

## Troubleshooting

### Plugin says "Invalid JSON"
- Check for trailing commas in JSON
- Validate at jsonlint.com
- Common issue: missing bracket

### Tokens imported but not showing
- Make sure you "Sync to Figma Variables" after import
- Check token set is "enabled" in plugin

### Can't apply token to property
- Some Figma properties don't support variables yet
- Shadows: use hex for now (Figma working on it)
- Gradients: create as styles, not variables

### Dark mode not switching
- Check "$themes" section in JSON exists
- Verify "dark" token set is enabled
- Make sure using alias/component tokens, not brand

## Success Criteria

You'll know this is working when:

✅ You can toggle dark mode in Figma and components update
✅ You find a design issue in Figma before writing code
✅ You reference Figma to know which token to use in code
✅ Designer and developer use same token names
✅ Changing one brand token updates all components

## Time Investment

**Setup**: 15 min (one time)
**Learning**: 2-3 hours (build a few components, get comfortable)
**Payoff**: Saves hours of back-and-forth, prevents dark mode bugs, ensures consistency

## Get Help

- Tokens Studio docs: https://docs.tokens.studio/
- Figma variables docs: https://help.figma.com/hc/en-us/articles/15339657135383
- Component inventory: See agent output with all component issues
- Full workflow: `FIGMA_WORKFLOW.md`
