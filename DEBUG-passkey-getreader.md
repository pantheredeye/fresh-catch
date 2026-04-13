# DEBUG: Passkey Setup — `getReader` on null

**Error:** `react-server-dom-web….production.js:1848 TypeError: Cannot read properties of null (reading 'getReader')`
**Trigger:** `Login.tsx:430` — `await startPasskeyRegistration(email.trim())`

---

## Root Cause: `sessions.save()` creates a NEW session, orphaning the authenticated one

### The kill chain

1. User completes OTP login → `verifyOtp()` calls `rotateSession()` → browser gets session cookie with `{ userId, currentOrganizationId, role }`
2. User clicks "Set up passkey" → calls `startPasskeyRegistration(email)`
3. `startPasskeyRegistration` calls:
   ```ts
   sessions.save(response.headers, { challenge: options.challenge })
   ```
4. **`sessions.save()` ALWAYS generates a new session ID** (rwsdk `session.js:92-96`):
   ```js
   const save = async (responseHeaders, sessionInputData) => {
       const sessionId = await generateSessionId({ secretKey }); // NEW ID every time
       await set(sessionId, sessionInputData);
       responseHeaders.set("Set-Cookie", ...); // Overwrites cookie
   };
   ```
5. A **brand new session** is created containing ONLY `{ challenge }` — no userId, no org, no role
6. The `Set-Cookie` header goes out with the RSC response → browser replaces the authenticated cookie
7. The server function itself returns `options` successfully — **but the response headers destroy the session**
8. On the NEXT request (`finishPasskeyRegistration`), middleware loads the new session → `userId` is null

### But why `getReader` on null?

The `getReader` crash happens because the middleware redirects when it finds a session inconsistency. The middleware at `worker.tsx:310-319`:

```ts
} else {
  // Membership revoked — clear org context and redirect
  response.headers.set("Location", "/");
  return new Response(null, { status: 302, headers: response.headers });
}
```

This is a **raw redirect** (not `safeRedirect`). During a server action:
- Client uses `fetch(url, { redirect: "manual" })` (rwsdk client.js:62)
- Browser converts 302 to an **opaque redirect**: status 0, headers empty, body null
- Client redirect check fails (status 0, not >= 300) (rwsdk client.js:106)
- Falls to `createFromFetch(response)` → `response.body.getReader()` → body is null → **crash**

### Possible secondary trigger

Even if the membership-revoked path isn't hit, the session destruction means `finishPasskeyRegistration` checks `ctx.session?.userId` (functions.ts:386) and returns `{ success: false, error: "Not authenticated" }`. So even without the crash, passkey setup would fail silently.

---

## Two bugs, one flow

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | `sessions.save()` in `startPasskeyRegistration` creates new session, wiping auth | `functions.ts:374` | Session destroyed, passkey verification fails |
| 2 | Membership-revoked redirect doesn't use `safeRedirect` | `worker.tsx:318-319` | `getReader` crash on any server action that triggers this path |

---

## Fix plan

### Bug 1: Session wipe (primary)

The DO's `saveSession()` already merges fields (durableObject.ts:44-64). The problem is that `sessions.save()` creates a **new DO instance** (new session ID) instead of updating the existing one. We need to update the existing session in-place.

**Option A — Load session, update via DO stub directly:**
```ts
// In startPasskeyRegistration, instead of sessions.save():
const stub = getSessionStub(requestInfo.request, env);
await stub.saveSession({ challenge: options.challenge });
// No new cookie, same session, merged data
```

**Option B — Pass all existing fields to sessions.save():**
```ts
const session = await sessions.load(requestInfo.request);
await sessions.save(response.headers, {
  ...session,
  challenge: options.challenge,
});
```
Problem: still creates a new session ID (unnecessary rotation). Works but wasteful.

**Option A is better** — it updates in-place without creating a new session.

### Bug 2: Raw redirect (secondary)

Change `worker.tsx:318-319` from:
```ts
response.headers.set("Location", "/");
return new Response(null, { status: 302, headers: response.headers });
```
To:
```ts
return safeRedirect(request, "/", response.headers);
```

---

## Reference: Official RWSDK passkey addon

From https://github.com/redwoodjs/passkey-addon/tree/main/src:
- Uses `sessions.save(headers, { challenge })` — **same pattern as ours**
- But the addon's session DO is simpler (only stores userId + challenge)
- The addon doesn't have complex middleware that redirects on session state
- The addon uses `throw new Response(null, {status: 302})` for redirects (not `return`)

Key insight: the addon "works" because its middleware doesn't check org membership. The session wipe still happens but doesn't trigger a redirect because there's no membership validation. The challenge is still stored (in the new session), and the user's passkey is still verified. But the userId is lost — the addon's `finishPasskeyRegistration` creates a NEW user instead of linking to existing.

**Our case is different**: we have org-aware middleware that detects the session wipe as a membership mismatch → redirect → crash.

---

## Fix applied (2026-04-12)

### Bug 1 — session wipe
All `sessions.save(response.headers, { challenge })` calls replaced with direct DO stub updates via `getSessionStub()` + `stub.saveSession()`. This updates the existing session in-place (the DO's `saveSession` merges fields) without creating a new session ID or cookie.

**Files changed:**
- `src/app/pages/user/functions.ts` — `startPasskeyRegistration`, `finishPasskeyRegistration`, `startPasskeyLogin`, `finishPasskeyLogin`
- `src/app/pages/admin/functions.ts` — `startBusinessOwnerRegistration`, `finishBusinessOwnerRegistration`

Note: `sessions.save` calls that intentionally create new sessions (auto-login in `finishBusinessOwnerRegistration`, `rotateSession`) are left as-is — those SHOULD create new sessions.

### Bug 2 — raw redirect
`worker.tsx` membership-revoked redirect changed from raw `new Response(null, {status: 302})` to `safeRedirect(request, "/", response.headers)`.

---

## Status

- [x] Root cause identified
- [x] Reference addon analyzed
- [x] Fix implemented
- [x] Types pass
- [ ] Tested in browser
