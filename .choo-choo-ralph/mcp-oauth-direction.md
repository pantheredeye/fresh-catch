# OAuth 2.1 — Future Direction for MCP Auth

## Date: 2026-04-07

## Current State

API key auth works for all current use cases:

- **Vendor self-service**: Vendor generates key in admin UI (`src/app/pages/admin/ApiSettingsPage.tsx`), connects Claude Desktop or other MCP client using that key
- **Known clients only**: All MCP consumers are either the vendor themselves or our own customer-facing AI agent
- **Implementation**: `fc_key_*` format, SHA-256 hashed, raw shown once (`src/utils/api-keys.ts`). Validated in `worker.tsx` before MCP endpoint routing
- **Role-based access**: API key holders get `vendor` role; dev secret gets `operator` role. Role propagated via `X-Role` header to MCP Durable Object

This is sufficient. No OAuth complexity is needed today.

---

## Why OAuth 2.1

The MCP specification (2025-03-26 revision) mandates OAuth 2.1 for HTTP-based transports when third-party clients connect. Specifically:

1. **Spec compliance**: MCP servers that accept connections from arbitrary third-party clients over HTTP/SSE must implement OAuth 2.1 with PKCE. This is not optional in the spec — it's the required auth mechanism for the HTTP transport.
2. **Third-party client support**: When MCP clients beyond Claude Desktop (e.g., other AI assistants, developer tools, partner integrations) want to connect, they expect the standard OAuth discovery + token flow. API keys don't work here because there's no way for the client to request scoped access or for the vendor to consent.
3. **Delegated access**: OAuth enables a vendor to grant a third-party app access to specific tools (e.g., read-only catch data) without sharing their full API key. Scoped tokens > shared secrets.
4. **Ecosystem compatibility**: As MCP adoption grows, client libraries will implement the spec's auth flow. Non-compliant servers get left out.

---

## What It Involves

An OAuth 2.1 implementation requires these components:

### Authorization Server Endpoints
- `GET /.well-known/oauth-authorization-server` — Discovery document (issuer, endpoints, supported grants)
- `GET /authorize` — Authorization endpoint (presents consent UI, issues auth code)
- `POST /token` — Token endpoint (exchanges auth code for access token)
- `POST /token` (refresh) — Refresh token grant

### Consent UI
- Web page where vendor reviews what a third-party client is requesting
- Shows requested scopes (e.g., "read catch data", "manage orders")
- Vendor approves or denies
- Must be rendered server-side (can't be a client component since it's a redirect target)

### Token Management
- Short-lived access tokens (e.g., 1 hour)
- Refresh tokens for long-lived sessions
- Token storage in D1 (new `OAuthToken` model) or Durable Object state
- Token revocation endpoint

### PKCE (Proof Key for Code Exchange)
- Required by OAuth 2.1 (not optional like in 2.0)
- Client generates code verifier + challenge
- Server validates on token exchange
- Prevents authorization code interception

### Scope Definitions
- Map to MCP tool categories: `catch:read`, `catch:write`, `orders:read`, `orders:write`, `markets:read`
- Vendor controls which scopes each client gets

---

## When to Build It

**Trigger**: When third-party MCP clients need to connect to vendor servers.

Not before. The signals to watch for:

1. A partner or developer asks to build an integration using our MCP endpoint
2. An MCP client beyond Claude Desktop attempts connection and fails on auth
3. MCP client libraries start rejecting non-OAuth servers by default
4. A vendor wants to grant limited access to a collaborator or service

**Current phase**: API keys are correct. They're simple, secure, and cover the vendor-self-service + our-own-clients use case perfectly. Adding OAuth before there's demand adds complexity with no user benefit.

---

## How It Maps to Cloudflare

### Option A: Cloudflare Access / Zero Trust (Shortcut)

Cloudflare Access can act as an OAuth-compatible authorization layer:

- **Service tokens**: Cloudflare Access issues tokens that can be validated at the edge
- **Access policies**: Per-application policies control who can reach the MCP endpoint
- **Identity providers**: Integrates with Google, GitHub, SAML, etc. — vendors wouldn't need Fresh Catch-specific credentials
- **JWT validation**: Access tokens are JWTs signed by Cloudflare, verifiable in Workers via `@cloudflare/access`
- **Tradeoff**: Less control over scopes and consent UX. Cloudflare Access doesn't natively understand MCP tool scopes — we'd need a mapping layer

### Option B: Custom Authorization Server on Workers

- Full control over scopes, consent UI, token lifetimes
- Built on Workers + D1 for token storage
- More work, but exactly matches the MCP spec's expectations
- Libraries: `@panva/oauth4-webapi` or hand-roll (the spec is well-defined)

### Recommended Path

Start with **Option A** (Cloudflare Access) if third-party access is limited to a few known partners. Move to **Option B** when vendors need fine-grained consent over tool-level scopes, or when the MCP ecosystem standardizes discovery patterns we need to match exactly.

Hybrid approach: Cloudflare Access for identity verification, custom scope/consent layer on top.

---

## Migration Path from API Keys

When OAuth is implemented, API keys don't disappear:

1. **Phase 1 (current)**: API keys only
2. **Phase 2 (OAuth added)**: OAuth for third-party clients, API keys still work for vendor self-service
3. **Phase 3 (optional)**: Deprecate API keys if all clients support OAuth. Or keep both indefinitely — API keys are fine for first-party use

The MCP Durable Object already receives auth context via `X-Role` header. OAuth tokens would resolve to the same role + org context, so the downstream MCP tool handlers don't change.

---

## Status: Deferred

This document is a reference for future planning. No implementation work is needed or planned until the triggers above are met. The current API key auth is correct for the current stage of the product.
