---
title: "Magic Link + OTP Hybrid"
created: 2026-04-05
updated: 2026-04-05
poured:
  - fresh-catch-mol-ncb8z
  - fresh-catch-mol-m8sb3
  - fresh-catch-mol-0w693
  - fresh-catch-mol-tl504
  - fresh-catch-mol-com8z
  - fresh-catch-mol-xwlyq
iteration: 1
auto_discovery: false
auto_learnings: false
---

<project_specification>
<project_name>Magic Link + OTP Hybrid</project_name>
<overview>Enhance the OTP auth flow with a magic link in the same email. User taps a button in the email → auto-authenticated, back in the app. OTP code remains as fallback. Also adds domain-aware "Open Email" button on the OTP screen and same-device detection for cross-device safety. Target: older users at farmers markets who shouldn't have to remember or type 6-digit codes.</overview>

<context>
  <existing_patterns>
    - OTP flow: src/app/pages/user/functions.ts (requestOtp, verifyOtp, updateName)
    - Session DO: src/session/durableObject.ts (OtpState with code/email/createdAt/attempts, saveOtp, verifyOtp, clearOtp)
    - Session store: src/session/store.ts (rotateSession, saveOtp, verifyOtpViaSession, getSessionStub)
    - Email: src/utils/email.ts (sendOtpEmail), src/emails/OtpVerification.tsx (React Email template with WebOTP format)
    - Client: src/app/pages/user/Login.tsx (screens: email, otp, passkey-prompt, name, passkey-nudge, success)
    - Routes: src/app/pages/user/routes.ts (userRoutes: /login, /logout, /join/invite, /join)
    - Worker: src/worker.tsx (middleware: origin validation, session loading, user context, tenant resolution)
    - Auth layout: src/layouts/AuthLayout.tsx wraps userRoutes
    - Rate limits: src/rate-limit/durableObject.ts (otpSend: 3/15min, otpVerify: 10/15min)
    - APP_URL env var: "https://market.digitalglue.dev"
  </existing_patterns>

  <integration_points>
    - OtpState: add magicToken + deviceId fields
    - Session DO: add verifyMagicToken method
    - Session store: add verifyMagicTokenViaSession helper
    - functions.ts: requestOtp sets deviceId cookie, generates magicToken
    - OtpVerification.tsx: add magic link button above OTP code
    - Login.tsx: add "Open Email" button on OTP screen
    - routes.ts: add /auth/verify route for magic link handler
    - worker.tsx: add /auth/verify BEFORE render() — it's a redirect, not RSC
    - OTP TTL: bump from 5 min → 10 min (email delivery can be slow)
  </integration_points>

  <decisions>
    - Magic link and OTP share the same OtpState — whichever is used first wins (single use)
    - Same-device detection via cookie (deviceId set on requestOtp, checked on magic link click)
    - Cross-device magic link click → show "enter code on your original device" message, NOT auto-login
    - Magic link URL: https://market.digitalglue.dev/auth/verify?token=TOKEN
    - Token format: 64-byte crypto random, base64url encoded (~86 chars)
    - OTP TTL bumped to 10 minutes (applies to both code and magic token)
    - "Open Email" button: domain-aware (Gmail, Outlook, Yahoo, iCloud), fallback to mailto:
    - Rate limiting: magic link verification shares the otpVerify rate limit bucket
  </decisions>
</context>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- TASKS                                                  -->
<!-- ═══════════════════════════════════════════════════════ -->

<phase id="1" name="Magic Link + Open Email">
  <goal>One-tap sign-in from email. User enters email → gets email with big button + code → taps button → authenticated and back in app. OTP code remains as fallback for cross-device or manual entry.</goal>

  <task id="1.1" name="OtpState: add magicToken + deviceId, bump TTL">
    <description>Extend OtpState in Session DO with magic link token and device tracking. Add verifyMagicToken method. Bump TTL from 5 to 10 minutes.</description>
    <details>
**Modify src/session/durableObject.ts:**

Update OtpState interface:
```typescript
export interface OtpState {
  code: string;
  email: string;
  magicToken: string;   // NEW: 64-byte crypto random, base64url
  deviceId: string;     // NEW: matches cookie set on requesting device
  createdAt: number;
  attempts: number;
}
```

Update saveOtp to generate magicToken and accept deviceId:
```typescript
async saveOtp(email: string, deviceId: string): Promise<OtpState> {
  // ... existing code generation ...

  // Generate magic link token (64 bytes → ~86 char base64url)
  const tokenBytes = new Uint8Array(64);
  crypto.getRandomValues(tokenBytes);
  const magicToken = btoa(String.fromCharCode(...tokenBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const otp: OtpState = {
    code,
    email,
    magicToken,
    deviceId,
    createdAt: Date.now(),
    attempts: 0,
  };

  await this.ctx.storage.put<OtpState>("otp", otp);
  return otp;
}
```

Add verifyMagicToken method:
```typescript
async verifyMagicToken(
  token: string,
  submittedDeviceId: string,
): Promise<{
  valid: boolean;
  email?: string;
  expired?: boolean;
  sameDevice?: boolean;
}> {
  const otp = await this.ctx.storage.get<OtpState>("otp");
  if (!otp) return { valid: false };

  // TTL check: 10 minutes
  if (Date.now() - otp.createdAt > 10 * 60 * 1000) {
    await this.clearOtp();
    return { valid: false, expired: true };
  }

  // Constant-time token comparison
  const a = new TextEncoder().encode(otp.magicToken);
  const b = new TextEncoder().encode(token);
  let mismatch = a.length !== b.length ? 1 : 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= a[i] ^ b[i];
  }

  if (mismatch !== 0) return { valid: false };

  const sameDevice = otp.deviceId === submittedDeviceId;

  // Only auto-login on same device. Cross-device: don't consume the OTP.
  if (sameDevice) {
    await this.clearOtp();
  }

  return { valid: true, email: otp.email, sameDevice };
}
```

**Update OTP TTL** in verifyOtp from 5 min to 10 min:
```typescript
// Was: 5 * 60 * 1000
if (Date.now() - otp.createdAt > 10 * 60 * 1000) {
```

**Update src/session/store.ts** — update saveOtp signature:
```typescript
export async function saveOtp(
  request: Request,
  sessionEnv: Env,
  email: string,
  deviceId: string,
): Promise<OtpState | null> {
  const stub = getSessionStub(request, sessionEnv);
  if (!stub) return null;
  return stub.saveOtp(email, deviceId);
}
```

Add verifyMagicTokenViaSession helper:
```typescript
export async function verifyMagicTokenViaSession(
  request: Request,
  sessionEnv: Env,
  token: string,
  deviceId: string,
): Promise<{
  valid: boolean;
  email?: string;
  expired?: boolean;
  sameDevice?: boolean;
} | null> {
  const stub = getSessionStub(request, sessionEnv);
  if (!stub) return null;
  return stub.verifyMagicToken(token, deviceId);
}
```
    </details>
    <done_when>OtpState has magicToken + deviceId. saveOtp generates both. verifyMagicToken validates token with constant-time comparison and same-device check. TTL is 10 minutes for both OTP and magic token. Store helpers updated.</done_when>
  </task>

  <task id="1.2" name="requestOtp: generate deviceId cookie + magicToken">
    <description>Update requestOtp to set a deviceId cookie and pass it to saveOtp. Return the magic link URL for the email template.</description>
    <details>
**Modify src/app/pages/user/functions.ts — requestOtp:**

Generate a deviceId and set it as a cookie:
```typescript
export async function requestOtp(email: string) {
  // ... existing validation + rate limit ...

  const { request, response } = requestInfo;

  // Generate device ID for same-device detection
  const deviceBytes = new Uint8Array(16);
  crypto.getRandomValues(deviceBytes);
  const deviceId = btoa(String.fromCharCode(...deviceBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Set deviceId cookie (10-minute TTL, matches OTP TTL)
  const isViteDev = import.meta.env.VITE_IS_DEV_SERVER;
  response.headers.append(
    "Set-Cookie",
    `fc_device=${deviceId}; Path=/; HttpOnly; ${isViteDev ? "" : "Secure; "}SameSite=Strict; Max-Age=600`
  );

  // Generate OTP + magic token
  const otp = await saveOtp(request, env, email, deviceId);

  // Build magic link URL
  const appUrl = env.APP_URL || `${new URL(request.url).origin}`;
  const magicUrl = `${appUrl}/auth/verify?token=${otp.magicToken}`;

  // Check for passkey hint
  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: { credentials: true },
  });
  const hint = user?.credentials && user.credentials.length > 0 ? "passkey" : undefined;

  // Send email with magic link + code
  if (otp) {
    sendOtpEmail({ to: email, code: otp.code, magicUrl }).catch((err) =>
      console.error("[OTP] Email send failed:", err)
    );
  }

  await delay;
  return { success: true, hint };
}
```

**Update sendOtpEmail signature** in src/utils/email.ts:
```typescript
export async function sendOtpEmail(data: { to: string; code: string; magicUrl: string }) {
  const html = await render(OtpVerification({ code: data.code, magicUrl: data.magicUrl }));
  return sendEmail({
    to: data.to,
    subject: `${data.code} is your Fresh Catch code`,
    html,
    from: 'Fresh Catch <auth@digitalglue.dev>',
  });
}
```
    </details>
    <done_when>requestOtp sets fc_device cookie, generates magicToken via saveOtp, builds magic URL from APP_URL, passes magicUrl to email template.</done_when>
  </task>

  <task id="1.3" name="Email template: add magic link button">
    <description>Update OtpVerification.tsx to include a prominent "Sign In" button (magic link) above the OTP code.</description>
    <details>
**Modify src/emails/OtpVerification.tsx:**

Add magicUrl prop and a large CTA button:

```tsx
interface OtpVerificationProps {
  code: string;
  magicUrl: string;
}

export function OtpVerification({ code, magicUrl }: OtpVerificationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in to Fresh Catch</Heading>

          <Text style={text}>
            Tap the button below to sign in instantly:
          </Text>

          <Section style={buttonSection}>
            <a href={magicUrl} style={magicButton}>
              Sign In to Fresh Catch
            </a>
          </Section>

          <Text style={orText}>
            Or enter this code:
          </Text>

          <Section style={codeSection}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={text}>
            This link and code expire in 10 minutes.
          </Text>

          <Text style={webOtpText}>
            @market.digitalglue.dev #{code}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If you didn't request this, ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Magic button style (email-safe):**
```typescript
const magicButton = {
  display: 'inline-block',
  background: '#0066cc',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '16px 32px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  width: '100%',
  maxWidth: '320px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 40px',
};

const orText = {
  color: '#8898aa',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '24px 40px 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};
```

The button should be:
- Full width (up to 320px max) for easy tap on mobile
- High contrast (#0066cc bg, #fff text) — visible in sunlight
- 16px vertical padding — large tap target
- Above the code section — primary action, code is secondary
    </details>
    <done_when>Email template shows a prominent "Sign In to Fresh Catch" button linked to magic URL, with OTP code below as "Or enter this code:" fallback. WebOTP format preserved.</done_when>
  </task>

  <task id="1.4" name="Magic link route: /auth/verify">
    <description>Add server-side route that handles magic link clicks. Validates token, detects same/cross-device, authenticates or shows fallback message.</description>
    <details>
**This is a GET route** (clicked from email). It cannot be a server function — it's a direct navigation.

**Add to src/app/pages/user/routes.ts:**
```typescript
import { verifyMagicLink } from "./magic-link-handler";

export const userRoutes = [
  route("/login", LoginPage),
  route("/auth/verify", verifyMagicLink),  // NEW: magic link handler
  route("/join/invite", AcceptInvitePage),
  // ...existing routes
];
```

**Create src/app/pages/user/magic-link-handler.tsx:**

This is a server component / request handler. It:
1. Extracts `token` from query params
2. Reads `fc_device` cookie for same-device check
3. Calls verifyMagicTokenViaSession
4. If valid + same device → authenticate user (same logic as verifyOtp), redirect to app
5. If valid + different device → render a page: "Open the app on your original device and enter the code"
6. If invalid/expired → redirect to /login with error

```tsx
import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { env } from "cloudflare:workers";
import { verifyMagicTokenViaSession } from "@/session/store";
import { rotateSession } from "@/session/store";

export async function verifyMagicLink(requestInfo: RequestInfo) {
  const { request, response, ctx } = requestInfo;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  // Read device cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const deviceMatch = cookieHeader.match(/fc_device=([^;]+)/);
  const deviceId = deviceMatch?.[1] || "";

  // Verify magic token
  const result = await verifyMagicTokenViaSession(request, env, token, deviceId);

  if (!result || !result.valid) {
    // Expired or invalid — redirect to login
    const errorParam = result?.expired ? "?error=link-expired" : "?error=invalid-link";
    return new Response(null, {
      status: 302,
      headers: { Location: `/login${errorParam}` },
    });
  }

  if (!result.sameDevice) {
    // Different device — show cross-device message
    // Return a simple HTML page (no RSC needed)
    return new Response(
      crossDeviceHtml(result.email!),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Same device — authenticate
  const email = result.email!;
  let user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: {
      memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } },
      credentials: true,
    },
  });

  if (!user) {
    // New user — create account
    user = await db.user.create({
      data: { username: email, email, name: null },
      include: {
        memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } },
        credentials: true,
      },
    });

    const customerOrg = await db.organization.create({
      data: { name: `${email}'s Account`, slug: crypto.randomUUID(), type: "individual" },
    });

    await db.membership.create({
      data: { userId: user.id, organizationId: customerOrg.id, role: "owner" },
    });

    // Reload
    user = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } },
        credentials: true,
      },
    });
  }

  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  const businessMembership = user.memberships.find((m) => m.organization.type === "business");
  const defaultMembership = businessMembership ?? user.memberships[0];

  await rotateSession(request, response.headers, {
    userId: user.id,
    currentOrganizationId: defaultMembership?.organizationId ?? null,
    role: defaultMembership?.role ?? null,
  }, { maxAge: true });

  // Redirect to app
  const destination = isAdmin ? "/admin" : "/";
  response.headers.set("Location", destination);
  return new Response(null, { status: 302, headers: response.headers });
}

function crossDeviceHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fresh Catch — Different Device</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; padding: 20px;
      background: #f6f9fc; color: #1a2b3d;
    }
    .card {
      background: white; border-radius: 12px; padding: 40px;
      max-width: 400px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #64748b; line-height: 1.6; margin: 0 0 24px; }
    a {
      display: inline-block; background: #0066cc; color: white;
      text-decoration: none; padding: 12px 24px; border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Different device detected</h1>
    <p>This link was opened on a different device than where you started signing in.
       Go back to your original device and enter the 6-digit code from the email.</p>
    <a href="/login">Sign in on this device instead</a>
  </div>
</body>
</html>`;
}
```

**Important: route placement in worker.tsx.**
The /auth/verify route is inside userRoutes which is already inside `layout(AuthLayout, userRoutes)`. This works fine — the AuthLayout wrapper won't interfere since verifyMagicLink returns a Response directly (redirect or HTML), not an RSC component. The layout only wraps when the route returns JSX.

Actually, for the redirect responses this is fine. But the cross-device HTML response might get wrapped. To be safe, consider placing the route BEFORE the render() call in worker.tsx as a raw handler, OR ensure the AuthLayout passes through non-JSX responses.

**Safest approach**: Add the /auth/verify handler as a middleware in worker.tsx BEFORE the render() block, similar to the Stripe webhook handler:

```typescript
// In worker.tsx, after resolveBrowsingOrg() and before render():
async ({ ctx, request, response }) => {
  const url = new URL(request.url);
  if (url.pathname === "/auth/verify") {
    const { verifyMagicLink } = await import("@/app/pages/user/magic-link-handler");
    return verifyMagicLink({ request, response, ctx } as any);
  }
},
```

This ensures the magic link handler runs with full session/user context but before RSC rendering.
    </details>
    <done_when>GET /auth/verify validates magic token, authenticates same-device users (redirect to app), shows cross-device message for different devices, redirects to /login for invalid/expired tokens. User account creation works for new users (same as verifyOtp path).</done_when>
  </task>

  <task id="1.5" name="Client: Open Email button + magic link error handling">
    <description>Add domain-aware "Open Email" button on OTP screen. Handle ?error= params from magic link redirects.</description>
    <details>
**Add to Login.tsx — OTP screen, between the subtext and digit inputs:**

```tsx
function getEmailAction(email: string): { label: string; url: string } {
  const domain = email.split("@")[1]?.toLowerCase();
  const webmail: Record<string, { label: string; url: string }> = {
    "gmail.com":       { label: "Open Gmail",       url: "https://mail.google.com" },
    "googlemail.com":  { label: "Open Gmail",       url: "https://mail.google.com" },
    "outlook.com":     { label: "Open Outlook",     url: "https://outlook.live.com" },
    "hotmail.com":     { label: "Open Outlook",     url: "https://outlook.live.com" },
    "live.com":        { label: "Open Outlook",     url: "https://outlook.live.com" },
    "yahoo.com":       { label: "Open Yahoo Mail",  url: "https://mail.yahoo.com" },
    "icloud.com":      { label: "Open iCloud Mail", url: "https://www.icloud.com/mail" },
    "proton.me":       { label: "Open Proton Mail", url: "https://mail.proton.me" },
    "protonmail.com":  { label: "Open Proton Mail", url: "https://mail.proton.me" },
  };
  return webmail[domain] || { label: "Open Email", url: "mailto:" };
}
```

Render as a secondary button below the "Check your email" subtext, above the digit inputs:
```tsx
{screen === "otp" && (
  <>
    {/* heading + subtext */}
    ...

    {/* Open Email button */}
    <div style={{ textAlign: "center", marginBottom: "var(--space-md)" }}>
      <a
        href={getEmailAction(email).url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          padding: "var(--space-sm) var(--space-lg)",
          background: "var(--color-surface-secondary)",
          color: "var(--color-action-primary)",
          borderRadius: "var(--radius-md)",
          textDecoration: "none",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          border: "1px solid var(--color-border-light)",
        }}
      >
        {getEmailAction(email).label} ↗
      </a>
    </div>

    {/* digit inputs... */}
  </>
)}
```

The button opens in a new tab. User reads email, taps magic link → back in app. Or copies code, switches back, auto-fills.

**Also add helper text below the digits:**
```tsx
<p style={{
  fontSize: "var(--font-size-xs)",
  color: "var(--color-text-tertiary)",
  textAlign: "center",
  margin: "var(--space-sm) 0 0",
}}>
  Tap the button in the email to sign in instantly, or enter the code above
</p>
```

**Handle magic link error params on the email screen:**
```tsx
// In email screen useEffect or on mount:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const err = params.get("error");
  if (err === "link-expired") setError("That link has expired. Enter your email to get a new one.");
  if (err === "invalid-link") setError("That link is invalid. Enter your email to try again.");
  // Clean up URL
  if (err) window.history.replaceState({}, "", window.location.pathname);
}, []);
```
    </details>
    <done_when>OTP screen shows domain-aware "Open Email" button (Gmail, Outlook, Yahoo, etc). Helper text tells user they can tap the email button OR enter the code. Magic link error params show friendly messages on email screen.</done_when>
  </task>

  <task id="1.6" name="Name collection for magic-link new users">
    <description>Handle the case where a new user signs in via magic link and needs to provide their name. Magic link redirect goes to /login?welcome=true&needsName=true instead of directly to /.</description>
    <details>
**Problem:** When a new user taps the magic link, they're authenticated and redirected to the app. But they haven't provided their name yet. The OTP flow handles this with the "name" screen in Login.tsx, but the magic link bypasses Login.tsx entirely.

**Solution:** After magic link authentication, if the user has no name, redirect to /login with special params that tell Login.tsx to show the name screen directly:

In magic-link-handler.tsx, after successful auth:
```typescript
// Check if user needs name
if (!user.name) {
  const nameUrl = `/login?flow=name&admin=${isAdmin}`;
  response.headers.set("Location", nameUrl);
  return new Response(null, { status: 302, headers: response.headers });
}

// Existing user with name — go straight to app
const destination = isAdmin ? "/admin" : "/";
response.headers.set("Location", destination);
return new Response(null, { status: 302, headers: response.headers });
```

In Login.tsx, on mount:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  // Magic link landed here for name collection
  if (params.get("flow") === "name") {
    setIsAdmin(params.get("admin") === "true");
    setScreen("name");
    window.history.replaceState({}, "", "/login");
    return;
  }

  // ... existing ?b= and ?error= handling
}, []);
```

In LoginPage.tsx (server component), update the redirect logic:
```typescript
export function LoginPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;
  const url = new URL(requestInfo.request.url);

  // Don't redirect if magic link sent user here for name collection
  if (url.searchParams.get("flow") === "name" && ctx.user) {
    return <Login ctx={requestInfo.ctx} />;
  }

  // Existing auto-redirect for logged-in users
  if (ctx.user) {
    // ...existing redirect logic
  }

  return <Login ctx={requestInfo.ctx} />;
}
```

Also show passkey nudge after name submission for magic-link users (same as OTP path).
    </details>
    <done_when>New users who sign in via magic link are redirected to name collection screen. After entering name, they see passkey nudge (if no passkey), then proceed to app. Returning users with name go straight to app.</done_when>
  </task>
</phase>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- SECURITY MODEL                                         -->
<!-- ═══════════════════════════════════════════════════════ -->

<security_model>

## Magic Token Security

**Generation:** 64 bytes cryptographically random, base64url encoded (~86 chars). Entropy: 512 bits — computationally infeasible to brute force.

**Storage:** Stored in OtpState alongside the OTP code. Single-use: cleared from DO storage after successful same-device verification.

**Verification:** Constant-time comparison (XOR-based, same pattern as OTP verification). Prevents timing side-channels.

**TTL:** 10 minutes (shared with OTP code). After expiry, both magic token and OTP code are invalidated.

## Same-Device Detection

**Mechanism:** `fc_device` cookie set when requestOtp is called. HttpOnly, Secure, SameSite=Strict, 10-minute Max-Age.

**Checking:** When magic link is clicked, the handler reads the fc_device cookie and compares against the deviceId stored in OtpState.

**Cross-device behavior:** If cookie doesn't match (or is absent), the magic link does NOT authenticate. Instead shows a static HTML page telling user to enter the code on their original device. This prevents:
- Email forwarding attacks (someone forwards the email, recipient clicks link)
- Shared computer email access (reading email on work laptop, authenticating phone session)

**The OTP code is NOT consumed** on cross-device magic link clicks. The user can still enter the code on their original device.

## Rate Limiting

Magic link verification does NOT increment rate limits (it's a single-click action, not brute-forceable with 512-bit tokens). However:
- The token is cryptographically random (512 bits) — brute force is infeasible
- Each token is single-use (consumed on same-device success)
- Token expires after 10 minutes
- Only one active OTP/token pair per session at a time

## Anti-Enumeration

The magic link URL contains a random token, not the user's email. The /auth/verify endpoint:
- Returns redirect to /login for invalid tokens (no information leakage)
- Returns redirect to /login for expired tokens
- Does not reveal whether a user account exists

## Cookie Security

`fc_device` cookie:
- HttpOnly (no JS access)
- Secure (HTTPS only, except dev)
- SameSite=Strict (not sent cross-origin)
- Max-Age=600 (10 minutes, matches OTP TTL)
- Path=/ (available to /auth/verify route)
- Not used for authentication — only for same-device detection
- Contains a random ID, no PII

</security_model>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- FLOW DIAGRAMS                                          -->
<!-- ═══════════════════════════════════════════════════════ -->

<flow_diagrams>

## Same-Device Magic Link (Happy Path)

```
[Email screen]
  "your@email.com" → Continue
       |
       v
  requestOtp(email)
  → generates OTP code + magicToken + deviceId
  → sets fc_device cookie on browser
  → sends email with [Sign In] button + code
  → { success: true }
       |
       v
[OTP screen]
  "Check your email"
  [Open Gmail ↗] button
  [ _ _ _ _ _ _ ]
  "Tap the button in the email to sign in instantly"
       |
  User taps [Open Gmail ↗]
  → Gmail opens in new tab
  → User sees email with big [Sign In to Fresh Catch] button
  → User taps button
       |
       v
  GET /auth/verify?token=abc123...
  → reads fc_device cookie ✓ (same device)
  → verifyMagicToken: valid + sameDevice=true
  → creates user if new / finds existing
  → rotateSession
  → redirect to / or /admin
       |
       v
  [App loads — user is authenticated]
  (If new user without name: redirect to /login?flow=name first)
```

## Cross-Device Magic Link

```
  User starts on PHONE:
  [Email screen] → requestOtp → [OTP screen]
  fc_device cookie set on PHONE browser

  User opens email on LAPTOP:
  → taps [Sign In to Fresh Catch] button
       |
       v
  GET /auth/verify?token=abc123...
  → reads fc_device cookie: MISSING (different device)
  → verifyMagicToken: valid + sameDevice=false
  → OTP NOT consumed (still usable on phone)
       |
       v
  [Cross-device page]
  "Different device detected"
  "Go back to your original device and enter the 6-digit code"
  [Sign in on this device instead] → /login
```

## OTP Fallback (Code Entry)

```
  Same as before — user types/pastes 6-digit code
  → verifyOtp validates code
  → authenticates
  → magic token is also consumed (clearOtp)
```

## Both Paths Are Single-Use

```
  Magic link used first  → OTP cleared (can't reuse code)
  OTP code used first    → magic token cleared (can't reuse link)
  Either way: one auth per email request
```

</flow_diagrams>

</project_specification>
