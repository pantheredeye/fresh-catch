"use server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import { sessions, rotateSession, saveOtp, verifyOtpViaSession, resilientDO } from "@/session/store";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { env } from "cloudflare:workers";
import { checkRateLimit } from "@/rate-limit/middleware";
import { requireCsrf } from "@/session/csrf";
import { sendOtpEmail } from "@/utils/email";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, manager: 1 };

/** Auto-accept a pending invite for a user. Returns invite info or null. */
async function processInviteToken(userId: string, userEmail: string, inviteToken: string) {
  const invite = await db.invite.findUnique({
    where: { token: inviteToken },
    include: { organization: true },
  });

  if (!invite || invite.status !== "pending") return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;

  // Validate email match if invite specifies one
  if (invite.email) {
    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) return null;
  }

  // Check existing membership — only upgrade, never downgrade
  const existing = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
  });

  if (existing) {
    const currentRank = ROLE_RANK[existing.role] ?? 0;
    const inviteRank = ROLE_RANK[invite.role] ?? 0;
    if (inviteRank > currentRank) {
      await db.membership.update({
        where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
        data: { role: invite.role },
      });
    }
  } else {
    await db.membership.create({
      data: { userId, organizationId: invite.organizationId, role: invite.role },
    });
  }

  await db.invite.update({
    where: { id: invite.id },
    data: { status: "accepted", acceptedBy: userId },
  });

  const effectiveRole = existing
    ? (ROLE_RANK[existing.role] ?? 0) >= (ROLE_RANK[invite.role] ?? 0) ? existing.role : invite.role
    : invite.role;

  return {
    organizationId: invite.organizationId,
    orgName: invite.organization.name,
    role: effectiveRole,
  };
}
function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

function getWebAuthnConfig(request: Request) {
  const rpID = env.WEBAUTHN_RP_ID ?? new URL(request.url).hostname;
  const rpName = import.meta.env.VITE_IS_DEV_SERVER
    ? "Development App"
    : env.WEBAUTHN_APP_NAME;
  return {
    rpName,
    rpID,
  };
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

  const { request } = requestInfo;
  const otp = await saveOtp(request, env, email);

  if (otp) {
    try {
      const result = await sendOtpEmail({ to: email, code: otp.code });
      if (result.success) {
        console.log(`[OTP] Email sent to ${email}`);
      } else {
        console.warn(`[OTP] Email send failed for ${email}:`, result.error);
      }
    } catch (err) {
      console.warn(`[OTP] Email send error for ${email}:`, err);
    }
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

  // Check if user has passkey credentials FIRST — skip OTP if so
  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: { credentials: true },
  });
  const hasPasskey = user?.credentials && user.credentials.length > 0;

  if (hasPasskey) {
    await delay;
    return { success: true, hint: "passkey" as const };
  }

  // No passkey — generate and send OTP
  const otpResult = await sendOtpForEmail(email);
  await delay;

  if (!otpResult.success) {
    return otpResult;
  }

  return { success: true, hint: "otp" as const };
}

export async function verifyOtp(code: string, name?: string, inviteToken?: string) {
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

  // Verify OTP via session DO
  const result = await verifyOtpViaSession(request, env, code);

  if (!result) {
    return { success: false, error: "Session expired" };
  }

  if (!result.valid) {
    if (result?.locked) {
      return { success: false, error: "Too many failed attempts. Request a new code." };
    }
    if (result?.expired) {
      return { success: false, error: "Code expired. Request a new one." };
    }
    return { success: false, error: "Invalid code" };
  }

  const email = result.email!;

  // Look up user by email (stored in username field)
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
    // Create new user + individual org + membership
    user = await db.user.create({
      data: {
        username: email,
        email,
        name: name || null,
      },
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

    // Link to browsed vendor if ?b= param present
    const vendorOrg = ctx.browsingOrganization;
    if (vendorOrg) {
      await db.membership.create({
        data: { userId: user.id, organizationId: vendorOrg.id, role: "customer" },
      });
    }

    // Reload memberships after creation
    const reloaded = await db.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { updatedAt: "desc" },
        },
        credentials: true,
      },
    });
    if (!reloaded) {
      return { success: false, error: "Account creation failed. Please try again." };
    }
    user = reloaded;
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
        // Reload memberships
        const reloadedUser = await db.user.findUnique({
          where: { id: user.id },
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { updatedAt: "desc" },
            },
            credentials: true,
          },
        });
        if (!reloadedUser) {
          return { success: false, error: "Account not found. Please try again." };
        }
        user = reloadedUser;
      }
    }
  }

  // Auto-accept invite if token provided
  let inviteResult: { organizationId: string; orgName: string; role: string } | null = null;
  if (inviteToken) {
    inviteResult = await processInviteToken(user.id, email, inviteToken);
    if (inviteResult) {
      // Reload memberships after invite acceptance
      const inviteReloaded = await db.user.findUnique({
        where: { id: user.id },
        include: {
          memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } },
          credentials: true,
        },
      });
      if (!inviteReloaded) {
        return { success: false, error: "Account not found. Please try again." };
      }
      user = inviteReloaded;
    }
  }

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

  await rotateSession(
    request,
    response.headers,
    {
      userId: user.id,
      currentOrganizationId: sessionOrg.organizationId,
      role: sessionOrg.role,
    },
    { maxAge: true }
  );

  return {
    success: true,
    isAdmin: isAdmin || !!(inviteResult && (inviteResult.role === "owner" || inviteResult.role === "manager")),
    needsName: !user.name,
    hasPasskey: user.credentials.length > 0,
    inviteAccepted: !!inviteResult,
    inviteOrgName: inviteResult?.orgName,
  };
}

export async function updateName(csrfToken: string, name: string) {
  requireCsrf(csrfToken);

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { success: false, error: "Name required" };
  }

  const { ctx } = requestInfo;
  if (!ctx.session?.userId) {
    return { success: false, error: "Not authenticated" };
  }

  await db.user.update({
    where: { id: ctx.session.userId },
    data: { name: name.trim() },
  });

  return { success: true };
}

export async function startPasskeyRegistration(username: string) {
  if (!isValidEmail(username)) throw new Error("Invalid email format");

  const { rpName, rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  await resilientDO(() => sessions.save(response.headers, { challenge: options.challenge }), "startPasskeyReg.save");

  return options;
}

export async function finishPasskeyRegistration(
  registration: RegistrationResponseJSON,
) {
  const { request, response, ctx } = requestInfo;
  const { origin } = new URL(request.url);

  // Require logged-in user
  if (!ctx.session?.userId) {
    return { success: false, error: "Not authenticated" };
  }

  const session = await resilientDO(() => sessions.load(request), "finishPasskeyReg.load");
  const challenge = session?.challenge;

  if (!challenge) {
    return { success: false, error: "No challenge" };
  }

  // Reject expired challenges
  if (session?.challengeCreatedAt && Date.now() - session.challengeCreatedAt > CHALLENGE_TTL_MS) {
    await resilientDO(() => sessions.save(response.headers, { challenge: null }), "finishPasskeyReg.expiry");
    return { success: false, error: "Challenge expired" };
  }

  const verification = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { success: false, error: "Verification failed" };
  }

  await resilientDO(() => sessions.save(response.headers, { challenge: null }), "finishPasskeyReg.clearChallenge");

  // Create or update credential (upsert guards against duplicate registration from double-clicks / retries)
  await db.credential.upsert({
    where: { credentialId: verification.registrationInfo.credential.id },
    create: {
      userId: ctx.session.userId,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
    update: {
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
  });

  return { success: true };
}

export async function startPasskeyLogin(email: string) {
  if (!isValidEmail(email)) throw new Error("Invalid email format");

  const { rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: { credentials: true },
  });

  const allowCredentials = user?.credentials.map((cred) => ({
    id: cred.credentialId,
    type: "public-key" as const,
  })) || [];

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials,
  });

  await resilientDO(() => sessions.save(response.headers, { challenge: options.challenge }), "startPasskeyLogin.save");

  return options;
}

export async function finishPasskeyLogin(login: AuthenticationResponseJSON, inviteToken?: string) {
  const { request, response } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await resilientDO(() => sessions.load(request), "finishPasskeyLogin.load");
  const challenge = session?.challenge;

  if (!challenge) {
    return false;
  }

  // Reject expired challenges
  if (session?.challengeCreatedAt && Date.now() - session.challengeCreatedAt > CHALLENGE_TTL_MS) {
    await resilientDO(() => sessions.save(response.headers, { challenge: null }), "finishPasskeyLogin.expiry");
    return false;
  }

  const credential = await db.credential.findUnique({
    where: {
      credentialId: login.id,
    },
  });

  if (!credential) {
    return false;
  }

  const verification = await verifyAuthenticationResponse({
    response: login,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
    requireUserVerification: false,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: credential.counter,
    },
  });

  if (!verification.verified) {
    return false;
  }

  // Detect cloned authenticator (counter should never decrease)
  const newCounter = verification.authenticationInfo.newCounter;
  if (credential.counter > 0 && newCounter <= credential.counter) {
    console.warn(`Credential cloning detected: ${login.id}, counter ${newCounter} <= ${credential.counter}`);
    return false;
  }

  await db.credential.update({
    where: {
      credentialId: login.id,
    },
    data: {
      counter: newCounter,
    },
  });

  const user = await db.user.findUnique({
    where: {
      id: credential.userId,
    },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!user) {
    return { success: false, isAdmin: false };
  }

  // Auto-accept invite if token provided
  let inviteResult: { organizationId: string; orgName: string; role: string } | null = null;
  if (inviteToken) {
    inviteResult = await processInviteToken(user.id, user.email ?? user.username, inviteToken);
  }

  // Reload memberships if invite changed them
  const freshUser = inviteResult
    ? await db.user.findUnique({
        where: { id: user.id },
        include: { memberships: { include: { organization: true }, orderBy: { updatedAt: "desc" } } },
      })
    : user;

  if (!freshUser) {
    return { success: false, isAdmin: false };
  }

  const isAdmin = freshUser.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  const sessionOrg = inviteResult
    ? { organizationId: inviteResult.organizationId, role: inviteResult.role }
    : (() => {
        const biz = freshUser.memberships.find((m) => m.organization.type === "business");
        const def = biz ?? freshUser.memberships[0];
        return def ? { organizationId: def.organizationId, role: def.role } : null;
      })();

  await rotateSession(
    request,
    response.headers,
    {
      userId: user.id,
      currentOrganizationId: sessionOrg?.organizationId ?? null,
      role: sessionOrg?.role ?? null,
      challenge: null,
    },
    { maxAge: true }
  );

  return {
    success: true,
    isAdmin: isAdmin || !!(inviteResult && (inviteResult.role === "owner" || inviteResult.role === "manager")),
    inviteAccepted: !!inviteResult,
    inviteOrgName: inviteResult?.orgName,
  };
}
