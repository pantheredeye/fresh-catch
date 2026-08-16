"use server";
import { rotateSession } from "@/session/store";
import { generateCsrfToken } from "@/session/csrf";
import { createLoginCode, verifyLoginCode, normalizeEmail } from "@/auth/login-codes";
import { processInviteToken } from "@/auth/invites";
import { claimOrdersForUser } from "@/app/pages/orders/claims";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { checkRateLimit } from "@/rate-limit/middleware";
import { sendOtpEmail } from "@/utils/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export async function sendOtpForEmail(email: string) {
  if (!isValidEmail(email)) {
    return { success: false, error: "Invalid email" };
  }

  const rl = await checkRateLimit("otpSend");
  if (!rl.allowed) {
    return {
      success: false,
      error: "Too many attempts. Try again later.",
      rateLimited: true,
      retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000),
    };
  }

  const code = await createLoginCode(email);

  try {
    const result = await sendOtpEmail({ to: email.trim(), code });
    if (result.success) {
      console.log(`[OTP] Email sent to ${normalizeEmail(email)}`);
    } else {
      console.warn(`[OTP] Email send failed for ${normalizeEmail(email)}:`, result.error);
    }
  } catch (err) {
    console.warn(`[OTP] Email send error for ${normalizeEmail(email)}:`, err);
  }

  return { success: true };
}

export async function requestOtp(email: string) {
  // Anti-enumeration: add random delay (200-500ms) to normalize response times
  const delay = new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  if (!isValidEmail(email)) {
    await delay;
    return { success: false, error: "Invalid email" };
  }

  const otpResult = await sendOtpForEmail(email);
  await delay;

  return otpResult;
}

export async function verifyOtp(email: string, code: string, inviteToken?: string) {
  if (!isValidEmail(email)) {
    return { success: false, error: "Invalid email" };
  }
  if (!code || typeof code !== "string") {
    return { success: false, error: "Code required" };
  }

  const rl = await checkRateLimit("otpVerify");
  if (!rl.allowed) {
    return {
      success: false,
      error: "Too many attempts. Try again later.",
      rateLimited: true,
      retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000),
    };
  }

  const { request, response, ctx } = requestInfo;

  const result = await verifyLoginCode(email, code);

  if (!result.valid) {
    if (result.locked) {
      return { success: false, error: "Too many failed attempts. Request a new code." };
    }
    if (result.expired) {
      return { success: false, error: "Code expired. Request a new one." };
    }
    return { success: false, error: "Invalid code" };
  }

  const verifiedEmail = result.email!;

  // Look up user by email (stored in username field). Match both the
  // normalized form and the as-typed form for accounts created before
  // email normalization.
  let user = await db.user.findFirst({
    where: { username: { in: [verifiedEmail, email.trim()] }, deletedAt: null },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) {
    // Create new user + individual org + membership
    user = await db.user.create({
      data: {
        username: verifiedEmail,
        email: verifiedEmail,
      },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    const customerOrg = await db.organization.create({
      data: {
        name: `${verifiedEmail}'s Account`,
        slug: crypto.randomUUID(),
        type: "individual",
      },
    });

    await db.membership.create({
      data: { userId: user.id, organizationId: customerOrg.id, role: "owner" },
    });

    // Link to browsed vendor if ?b= param present
    const vendorOrg = ctx.browsingOrganization;
    if (vendorOrg) {
      await db.membership.create({
        data: { userId: user.id, organizationId: vendorOrg.id, role: "customer" },
      });
    }
  } else {
    // Existing user: link to browsed vendor if not already a member
    const vendorOrg = ctx.browsingOrganization;
    if (vendorOrg) {
      const existingMembership = user.memberships.find(
        (m) => m.organizationId === vendorOrg.id
      );
      if (!existingMembership) {
        await db.membership.create({
          data: { userId: user.id, organizationId: vendorOrg.id, role: "customer" },
        });
      }
    }
  }

  // Auto-accept invite if token provided
  let inviteResult: { organizationId: string; orgName: string; role: string } | null = null;
  if (inviteToken) {
    inviteResult = await processInviteToken(user.id, verifiedEmail, inviteToken);
  }

  // Claim any guest orders placed under this email. Never fails login.
  try {
    await claimOrdersForUser(user.id, verifiedEmail);
  } catch (error) {
    console.warn("Failed to claim guest orders:", error);
  }

  // Reload memberships once after any writes above
  const reloaded = await db.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!reloaded) {
    return { success: false, error: "Account not found. Please try again." };
  }
  user = reloaded;

  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  // If invite accepted, land in that org; otherwise prefer business org
  const sessionOrg = inviteResult
    ? { organizationId: inviteResult.organizationId, role: inviteResult.role }
    : (() => {
        const biz = user.memberships.find((m) => m.organization.type === "business");
        const def = biz ?? user.memberships[0];
        return { organizationId: def?.organizationId ?? null, role: def?.role ?? null };
      })();

  // Fresh CSRF token, generated here and returned to the client so post-login
  // actions never rely on a token rendered before the session rotated.
  const csrfToken = generateCsrfToken();

  await rotateSession(
    request,
    response.headers,
    {
      userId: user.id,
      currentOrganizationId: sessionOrg.organizationId,
      role: sessionOrg.role,
      csrfToken,
    },
    { maxAge: true }
  );

  const redirectTo = isAdmin
    ? "/admin"
    : ctx.browsingOrganization
      ? `/?b=${encodeURIComponent(ctx.browsingOrganization.slug)}`
      : "/";

  return {
    success: true,
    csrfToken,
    redirectTo,
    isAdmin,
    inviteAccepted: !!inviteResult,
    inviteOrgName: inviteResult?.orgName,
  };
}
