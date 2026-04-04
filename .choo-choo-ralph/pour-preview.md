# Multi-Tenant Pour Preview

**Spec tasks:** 17
**Implementation molecules:** 78
**Formula:** choo-choo-ralph (6 workflow steps each)
**Total beads:** ~468

---

## PR1: bbb-multi-tenant (55 molecules)

### security-order-scoping (P0) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 1 | Fix updateOrder: add orgId to WHERE clause | functional |
| 2 | Fix createCheckoutSession: add orgId to WHERE clause | functional |
| 3 | Fix cancelOrder: add orgId to WHERE clause | functional |
| 4 | Audit remaining customer order reads for orgId scoping | functional |

### security-stripe-webhook (P0) — 5 molecules
| # | Title | Category |
|---|-------|----------|
| 5 | Resolve orgId early in stripe webhook from stripeAccountId | functional |
| 6 | Add orgId to checkout.session.completed order lookups | functional |
| 7 | Add orgId to payment_intent webhook order lookups | functional |
| 8 | Add orgId to account.updated webhook handler | functional |
| 9 | Add warning logs for cross-org mismatch in webhooks | functional |

### tenant-middleware (P0) — 9 molecules
| # | Title | Category |
|---|-------|----------|
| 10 | Add slug field to AppContext.currentOrganization type | infrastructure |
| 11 | Update middleware org build step to include slug | infrastructure |
| 12 | Add browsingOrganization type to AppContext | infrastructure |
| 13 | Create tenant.ts middleware with resolveBrowsingOrg | infrastructure |
| 14 | Wire resolveBrowsingOrg into defineApp chain | infrastructure |
| 15 | Refactor CustomerHome to use ctx.browsingOrganization | functional |
| 16 | Refactor PastPopupsPage to use ctx.browsingOrganization | functional |
| 17 | Update CustomerLayout to pass browsingOrganization through | functional |
| 18 | Add ?b=slug preservation to order/auth links when browsing vendor | functional |

### setup-defaults (P1) — 1 molecule
| # | Title | Category |
|---|-------|----------|
| 19 | Clear hardcoded defaults in Setup.tsx | functional |

### header-dynamic (P1) — 5 molecules
| # | Title | Category |
|---|-------|----------|
| 20 | Add browsingOrganization to HeaderProps interface | functional |
| 21 | Update auth + admin header variants to read org name from props | functional |
| 22 | Update customer header variant to use browsingOrganization name | functional |
| 23 | Update CustomerLayout to pass browsingOrganization to Header | functional |
| 24 | Verify AdminLayout passes currentOrganization to Header | functional |

### org-utils-cleanup (P1) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 25 | Delete dead getPublicOrganizationName function | functional |
| 26 | Update getPublicOrganizationId: return null when multiple businesses | functional |
| 27 | Create getPublicOrganizations with active-market filter | functional |
| 28 | Update callers to handle null from getPublicOrganizationId | functional |

### vendor-directory (P1) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 29 | Create VendorDirectory component with card layout | functional |
| 30 | Wire VendorDirectory into CustomerHome fallback path | functional |
| 31 | Style VendorDirectory for mobile + desktop | style |
| 32 | Handle zero-business edge case with existing BusinessNotFound | functional |

### share-url-fix (P1) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 33 | Fix getCurrentOrgShareUrl to read slug from ctx | functional |
| 34 | Fix generateShareUrl: path model instead of subdomain | functional |
| 35 | Handle null org context gracefully in getCurrentOrgShareUrl | functional |
| 36 | Verify AdminDashboardUI + BottomNavigation share callers | functional |

### livebanner-dynamic (P2) — 3 molecules
| # | Title | Category |
|---|-------|----------|
| 37 | Add marketName prop to LiveBanner component | functional |
| 38 | Determine market name in CustomerHome data fetching | functional |
| 39 | Pass market name through CustomerHomeUI to LiveBanner | functional |

### registration-context-aware (P0) — 6 molecules
| # | Title | Category |
|---|-------|----------|
| 40 | Add ?b=slug param to login/register links on vendor pages | functional |
| 41 | Preserve ?b= param through Login.tsx registration redirect flow | functional |
| 42 | Replace hardcoded Fresh Catch lookup in registerWithPassword | functional |
| 43 | Replace hardcoded Fresh Catch lookup in finishPasskeyRegistration | functional |
| 44 | Update session save: use browsed vendor org or individual org | functional |
| 45 | Clean up Fresh Catch console.logs + comments in user/functions.ts | functional |

### remove-join-codes (P1) — 5 molecules
| # | Title | Category |
|---|-------|----------|
| 46 | Delete JoinPage.tsx and JoinUI.tsx files | functional |
| 47 | Remove addMembershipWithJoinCode from functions.ts | functional |
| 48 | Remove finishJoinCodeRegistration from functions.ts | functional |
| 49 | Update routes.ts: redirect /join to /login, keep /join/invite | functional |
| 50 | Remove ADMIN_CODE + MANAGER_CODE env var references | functional |

### login-org-resolution (P1) — 3 molecules
| # | Title | Category |
|---|-------|----------|
| 51 | Sort memberships by createdAt desc in finishPasskeyLogin | functional |
| 52 | Sort memberships by createdAt desc in loginWithPassword | functional |
| 53 | Handle edge case: user with no business memberships | functional |

### permissions-cleanup (P2) — 2 molecules
| # | Title | Category |
|---|-------|----------|
| 54 | Remove hardcoded "(Evan)" reference in permissions.ts comments | functional |
| 55 | Audit permissions.ts for any single-vendor assumptions | functional |

---

## PR2: bbb-org-free-browsing (23 molecules)

### vendor-profile-route (P1) — 5 molecules
| # | Title | Category |
|---|-------|----------|
| 56 | Update tenant middleware to parse /v/:slug from route params | infrastructure |
| 57 | Create VendorProfilePage.tsx server component | functional |
| 58 | Add /v/:slug route to worker.tsx render block | functional |
| 59 | Update generateShareUrl to produce /v/{slug} URLs | functional |
| 60 | Verify /?b=slug backwards compat still works | functional |

### membership-on-order (P1) — 6 molecules
| # | Title | Category |
|---|-------|----------|
| 61 | Update NewOrderPage to resolve vendor from browsingOrganization | functional |
| 62 | Update createOrder to accept vendor org from context | functional |
| 63 | Add auto-membership creation in createOrder for new customers | functional |
| 64 | Update session context after membership creation at order time | functional |
| 65 | Audit /orders/new links across codebase — add ?b=slug | functional |
| 66 | Handle order without vendor context: redirect to home | functional |

### cross-vendor-orders (P2) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 67 | Remove organizationId filter from CustomerOrdersPage query | functional |
| 68 | Add organization include to customer order query | functional |
| 69 | Update CustomerOrdersUI to show vendor name per order | functional |
| 70 | Ensure order detail links include vendor context | functional |

### membership-updated-at (P2) — 2 molecules
| # | Title | Category |
|---|-------|----------|
| 71 | Add updatedAt to Membership schema + create migration | infrastructure |
| 72 | Update login functions to sort by updatedAt instead of createdAt | functional |

### org-switcher-functions (P2) — 2 molecules
| # | Title | Category |
|---|-------|----------|
| 73 | Create listUserOrganizations server function | functional |
| 74 | Create switchOrganization server function with session update | functional |

### org-switcher-ui (P2) — 4 molecules
| # | Title | Category |
|---|-------|----------|
| 75 | Fetch user business orgs on mount in UserMenu | functional |
| 76 | Render org switcher dropdown when 2+ orgs | functional |
| 77 | Style org switcher dropdown with design tokens | style |
| 78 | Handle switch action: call switchOrganization + reload | functional |
