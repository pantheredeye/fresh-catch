# Improvements & Random TODOs

*Casual list of things we should probably do. Each item is small enough to discuss in isolation.*

## UI/UX Polish

- [ ] Test customer pages in dark system theme - do they break like admin pages?
- [ ] Add `color-scheme: light` to admin setup page - force light mode for now
- [ ] Design proper "Business Not Found" error page - currently just unstyled text
- [ ] Test all pages on mobile - especially admin forms
- [ ] Add loading states to forms - show spinners during async operations
- [ ] Check glassmorphism effects on different backgrounds - might need opacity tweaks

## Color System & Theming

- [ ] Audit which CSS variables get overridden by system themes
- [ ] Add explicit background fallbacks to critical surfaces (white cards, etc.)
- [ ] Design dark mode color palette - if we ever want to support it properly
- [ ] Document which components handle dark mode vs which don't
- [ ] Test gradients in dark mode environments

## Admin Experience

- [ ] Add slug preview/editor on business registration - show what URL they'll get
- [ ] Handle slug conflicts better - suggest alternatives if taken
- [ ] Add "copy shareable link" button somewhere in admin
- [ ] Show current slug in admin header or settings
- [ ] Better success messages after admin actions

## Error Handling

- [ ] Style the "Business Not Found" page properly
- [ ] Add helpful links on error pages (home, directory, signup)
- [ ] Consistent error message styling across all forms
- [ ] Better WebAuthn error messages - explain what went wrong
- [ ] Add 404 page design

## Performance & Technical

- [ ] Cache organization lookups by slug - avoid repeated DB queries
- [ ] Add indexes for slug lookups if needed
- [ ] Test with multiple organizations - does query performance hold up?
- [ ] Review bundle size - are we shipping too much JS?

## Data & Validation

- [ ] Define allowed characters in slugs - currently just removing special chars
- [ ] Min/max length for slugs
- [ ] Reserved slug list - prevent "admin", "api", "user", etc.
- [ ] Validate business names - min length, allowed chars
- [ ] Better slug generation from business names - handle unicode, etc.

## Documentation

- [ ] Update DESIGN_PATTERNS_REFERENCE.md with dark mode considerations
- [ ] Document slug generation logic somewhere
- [ ] Add examples of multi-tenant patterns to docs
- [ ] Screenshot current UI for design reference

## Future Features (Phase 2+)

- [ ] Business directory page - when we have multiple businesses
- [ ] Search functionality in directory
- [ ] Business profile pages - logo, description, contact
- [ ] Share link generator with QR code
- [ ] Analytics for business owners - how many views?

## Cleanup & Maintenance

- [ ] Remove `/customer` route completely - now using `/` instead
- [ ] Update wrangler.jsonc `__change_me__` placeholders
- [ ] Remove old migration scripts if any
- [ ] Clean up unused imports
- [ ] Update Prisma/Wrangler versions (saw update warnings)

---

*Updated: 2025-10-11*
*Format: Each item should be small enough to knock out in one session*
*Convert to GitHub issues when we have a pattern we like*
