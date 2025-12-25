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

export async function startPasskeyLogin() {
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

export async function finishPasskeyRegistration(
  username: string,
  registration: RegistrationResponseJSON,
) {
  const { request, response } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
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
  // Only business orgs need readable slugs like ?b=evan for public sharing
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

  // Link customer to Evan's business (Fresh Catch Seafood Markets) as a customer
  const evanBusiness = await db.organization.findFirst({
    where: { name: "Fresh Catch Seafood Markets" },
  });

  if (evanBusiness) {
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: evanBusiness.id,
        role: "customer",
      },
    });
  }

  // Auto-login: Create session with user context
  await sessions.save(response.headers, {
    userId: user.id,
    currentOrganizationId: customerOrg.id,
    role: "owner",
  });

  console.log(`✅ Customer registration complete: ${username} linked to Fresh Catch business`);
  return true;
}

export async function finishPasskeyLogin(login: AuthenticationResponseJSON) {
  const { request, response } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
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

  await db.credential.update({
    where: {
      credentialId: login.id,
    },
    data: {
      counter: verification.authenticationInfo.newCounter,
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

  // Set default organization context if user has memberships
  if (user.memberships.length > 0) {
    const defaultMembership = user.memberships[0];
    await sessions.save(response.headers, {
      userId: user.id,
      currentOrganizationId: defaultMembership.organizationId,
      role: defaultMembership.role,
      challenge: null,
    });
  } else {
    await sessions.save(response.headers, {
      userId: user.id,
      challenge: null,
    });
  }

  return { success: true, isAdmin };
}
