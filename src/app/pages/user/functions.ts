"use server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import { sessions, rotateSession, saveOtp, verifyOtpViaSession } from "@/session/store";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { env } from "cloudflare:workers";
import { checkRateLimit } from "@/rate-limit/middleware";
import { requireCsrf } from "@/session/csrf";
import { sendOtpEmail } from "@/utils/email";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export async function requestOtp(email: string) {
  // Anti-enumeration: add random delay (200-500ms) to normalize response times
  const delay = new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  if (!isValidEmail(email)) {
    await delay;
    return { success: false, error: "Invalid email" };
  }

  const rl = await checkRateLimit("otpSend");
  if (!rl.allowed) {
    await delay;
    return {
      success: false,
      error: "Too many attempts. Try again later.",
      rateLimited: true,
      retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000),
    };
  }

  const { request } = requestInfo;

  // Generate OTP via session DO (session guaranteed by middleware)
  const otp = await saveOtp(request, env, email);

  // Check if user has passkey credentials (hint for client)
  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: { credentials: true },
  });
  const hint = user?.credentials && user.credentials.length > 0 ? "passkey" : undefined;

  // Send OTP email (fire-and-forget)
  if (otp) {
    sendOtpEmail({ to: email, code: otp.code }).catch((err) =>
      console.error("[OTP] Email send failed:", err)
    );
  }

  await delay;
  // Never reveal account existence
  return { success: true, hint };
}

export async function verifyOtp(code: string, name?: string) {
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
    }
  }

  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  // Set default organization context — prefer business org for admins
  const businessMembership = user.memberships.find(
    (m) => m.organization.type === "business"
  );
  const defaultMembership = businessMembership ?? user.memberships[0];

  await rotateSession(
    request,
    response.headers,
    {
      userId: user.id,
      currentOrganizationId: defaultMembership?.organizationId ?? null,
      role: defaultMembership?.role ?? null,
    },
    { maxAge: true }
  );

  return {
    success: true,
    isAdmin,
    needsName: !user.name,
    hasPasskey: user.credentials.length > 0,
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

  await sessions.save(response.headers, { challenge: options.challenge });

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

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
    return { success: false, error: "No challenge" };
  }

  // Reject expired challenges
  if (session?.challengeCreatedAt && Date.now() - session.challengeCreatedAt > CHALLENGE_TTL_MS) {
    await sessions.save(response.headers, { challenge: null });
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

  await sessions.save(response.headers, { challenge: null });

  // Create credential for existing logged-in user only
  await db.credential.create({
    data: {
      userId: ctx.session.userId,
      credentialId: verification.registrationInfo.credential.id,
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

  await sessions.save(response.headers, { challenge: options.challenge });

  return options;
}

export async function startConditionalPasskeyLogin() {
  const { rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });

  await sessions.save(response.headers, { challenge: options.challenge });

  return options;
}

export async function finishPasskeyLogin(login: AuthenticationResponseJSON) {
  const { request, response } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
    return false;
  }

  // Reject expired challenges
  if (session?.challengeCreatedAt && Date.now() - session.challengeCreatedAt > CHALLENGE_TTL_MS) {
    await sessions.save(response.headers, { challenge: null });
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

  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  if (user.memberships.length > 0) {
    const businessMembership = user.memberships.find(
      (m) => m.organization.type === "business"
    );
    const defaultMembership = businessMembership ?? user.memberships[0];
    await rotateSession(
      request,
      response.headers,
      {
        userId: user.id,
        currentOrganizationId: defaultMembership.organizationId,
        role: defaultMembership.role,
        challenge: null,
      },
      { maxAge: true }
    );
  } else {
    await rotateSession(
      request,
      response.headers,
      {
        userId: user.id,
        challenge: null,
      },
      { maxAge: true }
    );
  }

  return { success: true, isAdmin };
}
