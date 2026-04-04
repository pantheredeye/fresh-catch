"use server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import { sessions } from "@/session/store";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { env } from "cloudflare:workers";
import { hashPassword, verifyPassword } from "@/utils/password";
import { checkRateLimit } from "@/rate-limit/middleware";

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

export async function startPasskeyRegistration(username: string) {
  if (!isValidEmail(username)) throw new Error("Invalid email format");

  const { rpName, rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    authenticatorSelection: {
      // Require the authenticator to store the credential, enabling a username-less login experience
      residentKey: "required",
      // Prefer user verification (biometric, PIN, etc.), but allow authentication even if it's not available
      userVerification: "preferred",
    },
  });

  await sessions.save(response.headers, { challenge: options.challenge });

  return options;
}

export async function checkEmailExists(email: string) {
  // Anti-enumeration: add random delay (200-500ms) to normalize response times
  const delay = new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  if (!isValidEmail(email)) {
    await delay;
    return { exists: false, hasPassword: false };
  }

  const rl = await checkRateLimit("checkEmail");
  if (!rl.allowed) {
    await delay;
    return { exists: false, hasPassword: false, rateLimited: true, retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000) };
  }

  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
  });
  await delay;
  return { exists: !!user, hasPassword: !!user?.passwordHash };
}

export async function loginWithPassword(
  email: string,
  password: string,
  rememberMe: boolean
) {
  if (!isValidEmail(email)) return { success: false, error: "Invalid email" };
  if (!password) return { success: false, error: "Password required" };

  const rl = await checkRateLimit("login");
  if (!rl.allowed) {
    return { success: false, error: "Too many login attempts. Try again later.", rateLimited: true, retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000) };
  }

  const { response } = requestInfo;

  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user?.passwordHash || !user?.passwordSalt) {
    return { success: false, error: "Invalid email or password" };
  }

  // Account lockout: if locked and lockout hasn't expired, reject
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    const newFailedAttempts = (user.failedAttempts ?? 0) + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newFailedAttempts,
        ...(newFailedAttempts >= 5
          ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
          : {}),
      },
    });
    return { success: false, error: "Invalid email or password" };
  }

  // Successful login: reset lockout counters
  if (user.failedAttempts > 0 || user.lockedUntil) {
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  if (user.memberships.length > 0) {
    const businessMembership = user.memberships.find(
      (m) => m.organization.type === "business"
    );
    const defaultMembership = businessMembership ?? user.memberships[0];
    await sessions.save(
      response.headers,
      {
        userId: user.id,
        currentOrganizationId: defaultMembership.organizationId,
        role: defaultMembership.role,
      },
      rememberMe ? { maxAge: true } : undefined
    );
  } else {
    await sessions.save(
      response.headers,
      { userId: user.id },
      rememberMe ? { maxAge: true } : undefined
    );
  }

  return { success: true, isAdmin };
}

export async function registerWithPassword(
  email: string,
  password: string,
  rememberMe: boolean
) {
  if (!isValidEmail(email)) return { success: false, error: "Invalid email" };
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const rl = await checkRateLimit("register");
  if (!rl.allowed) {
    return { success: false, error: "Too many registration attempts. Try again later.", rateLimited: true, retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000) };
  }

  const { response } = requestInfo;

  // Check if username already exists — generic error to prevent email enumeration
  const existingUser = await db.user.findUnique({ where: { username: email } });
  if (existingUser) {
    return { success: false, error: "Unable to create account. Please try again or sign in." };
  }

  const { hash, salt } = await hashPassword(password);

  const user = await db.user.create({
    data: {
      username: email,
      email,
      name: email,
      passwordHash: hash,
      passwordSalt: salt,
    },
  });

  // Create individual org
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

  // Link to browsed vendor if registering from a vendor page (?b=slug)
  const { ctx } = requestInfo;
  const vendorOrg = ctx.browsingOrganization;

  if (vendorOrg) {
    await db.membership.create({
      data: { userId: user.id, organizationId: vendorOrg.id, role: "customer" },
    });
  }

  await sessions.save(
    response.headers,
    {
      userId: user.id,
      currentOrganizationId: vendorOrg?.id || customerOrg.id,
      role: vendorOrg ? "customer" : "owner",
    },
    rememberMe ? { maxAge: true } : undefined
  );

  return { success: true, isAdmin: false };
}

export async function startPasskeyLogin(email: string) {
  if (!isValidEmail(email)) throw new Error("Invalid email format");

  const { rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  // Look up user by email (stored in username field)
  const user = await db.user.findFirst({
    where: { username: email, deletedAt: null },
    include: { credentials: true },
  });

  // If user not found, return empty allowCredentials (WebAuthn will fail gracefully)
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

export async function finishPasskeyRegistration(
  username: string,
  email: string,
  registration: RegistrationResponseJSON,
) {
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

  const verification = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return false;
  }

  await sessions.save(response.headers, { challenge: null });

  // Check if username already exists
  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log(`Registration failed: Username '${username}' already exists`);
    return false;
  }

  const user = await db.user.create({
    data: {
      username,
      email: email,
      name: username,
      phone: null,
    },
  });

  await db.credential.create({
    data: {
      userId: user.id,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
  });

  // Create individual organization for the customer
  // Use UUID for slug - customer orgs are private and never shared publicly
  // Only business orgs need readable slugs for public sharing
  const customerOrg = await db.organization.create({
    data: {
      name: `${username}'s Account`,
      slug: crypto.randomUUID(),
      type: "individual",
    },
  });

  // Make them a member of their own organization
  await db.membership.create({
    data: {
      userId: user.id,
      organizationId: customerOrg.id,
      role: "owner",
    },
  });

  // Link to browsed vendor if registering from a vendor page (?b=slug)
  const { ctx } = requestInfo;
  const vendorOrg = ctx.browsingOrganization;

  if (vendorOrg) {
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: vendorOrg.id,
        role: "customer",
      },
    });
  }

  await sessions.save(response.headers, {
    userId: user.id,
    currentOrganizationId: vendorOrg?.id || customerOrg.id,
    role: vendorOrg ? "customer" : "owner",
  }, { maxAge: true });

  // Customers are NOT admins (they're customers of business org, not owners)
  return { success: true, isAdmin: false };
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

  // Check if user has admin access (owner or manager role in a BUSINESS organization)
  // Note: Everyone is "owner" of their individual org, so we must check org type
  const isAdmin = user.memberships.some(
    (m) => (m.role === "owner" || m.role === "manager") && m.organization.type === "business"
  );

  // Set default organization context — prefer business org for admins
  // TODO: revisit for multi-tenant with multiple vendors
  if (user.memberships.length > 0) {
    const businessMembership = user.memberships.find(
      (m) => m.organization.type === "business"
    );
    const defaultMembership = businessMembership ?? user.memberships[0];
    await sessions.save(response.headers, {
      userId: user.id,
      currentOrganizationId: defaultMembership.organizationId,
      role: defaultMembership.role,
      challenge: null,
    }, { maxAge: true });
  } else {
    await sessions.save(response.headers, {
      userId: user.id,
      challenge: null,
    }, { maxAge: true });
  }

  return { success: true, isAdmin };
}
