import { verifyMagicTokenViaSession, rotateSession } from "@/session/store";
import { db } from "@/db";
import { env } from "cloudflare:workers";

/**
 * GET /auth/verify?token=<magicToken>
 * Server-side handler for magic link verification.
 * Runs as middleware before render() to return raw Response (no RSC wrapping).
 */
export async function handleMagicLinkVerify(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/login", url.origin).toString(), 302);
  }

  // Read fc_device cookie
  const cookieHeader = request.headers.get("Cookie");
  const deviceIdMatch = cookieHeader?.match(/fc_device=([^;]+)/);
  const submittedDeviceId = deviceIdMatch?.[1] ?? "";

  const result = await verifyMagicTokenViaSession(request, env, token, submittedDeviceId);

  if (!result || !result.valid) {
    const errorParam = result?.expired ? "link-expired" : "invalid-link";
    return Response.redirect(
      new URL(`/login?error=${errorParam}`, url.origin).toString(),
      302,
    );
  }

  // Cross-device: show informational page, do NOT consume OTP
  if (!result.sameDevice) {
    return new Response(crossDeviceHtml(url.origin), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Same device — authenticate
  const email = result.email!;
  const responseHeaders = new Headers();

  let user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { updatedAt: "desc" },
      },
      credentials: true,
    },
  });

  if (!user) {
    // Create new user + individual org + owner membership
    user = await db.user.create({
      data: { username: email, email, name: null },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { updatedAt: "desc" },
        },
        credentials: true,
      },
    });

    const customerOrg = await db.organization.create({
      data: {
        name: `${email}'s Account`,
        slug: crypto.randomUUID(),
        type: "individual",
      },
    });

    await db.membership.create({
      data: { userId: user.id, organizationId: customerOrg.id, role: "owner" },
    });

    // Reload memberships
    user = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { updatedAt: "desc" },
        },
        credentials: true,
      },
    });
  }

  const isAdmin = user.memberships.some(
    (m) =>
      (m.role === "owner" || m.role === "manager") &&
      m.organization.type === "business",
  );

  const businessMembership = user.memberships.find(
    (m) => m.organization.type === "business",
  );
  const defaultMembership = businessMembership ?? user.memberships[0];

  await rotateSession(
    request,
    responseHeaders,
    {
      userId: user.id,
      currentOrganizationId: defaultMembership?.organizationId ?? null,
      role: defaultMembership?.role ?? null,
    },
    { maxAge: true },
  );

  // New user without name: redirect to name collection
  if (!user.name) {
    const nameUrl = new URL("/login", url.origin);
    nameUrl.searchParams.set("flow", "name");
    nameUrl.searchParams.set("admin", String(isAdmin));
    nameUrl.searchParams.set("pk", user.credentials.length > 0 ? "1" : "0");
    responseHeaders.set("Location", nameUrl.toString());
    return new Response(null, { status: 302, headers: responseHeaders });
  }

  responseHeaders.set("Location", isAdmin ? "/admin" : "/");
  return new Response(null, { status: 302, headers: responseHeaders });
}

function crossDeviceHtml(origin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Different Device Detected</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1a2b3d; }
    .card { max-width: 400px; padding: 2rem; text-align: center; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
    p { color: #6b7280; line-height: 1.5; margin: 0 0 1.5rem; }
    a { display: inline-block; padding: .625rem 1.25rem; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500; }
    a:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Different device detected</h1>
    <p>Go back to your original device and enter the 6-digit code.</p>
    <a href="${origin}/login">Sign in on this device instead</a>
  </div>
</body>
</html>`;
}
