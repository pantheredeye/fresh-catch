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

export async function startPasskeyLogin(email: string) {
  const { rpID } = getWebAuthnConfig(requestInfo.request);
  const { response } = requestInfo;

  // Look up user by email (stored in username field)
  const user = await db.user.findUnique({
    where: { username: email },
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

  // Auto-login: Create session with Fresh Catch business context
  await sessions.save(response.headers, {
    userId: user.id,
    currentOrganizationId: evanBusiness?.id || customerOrg.id,  // Fresh Catch business, or fallback to personal org
    role: "customer",  // Customer role at Fresh Catch
  });

  console.log(`✅ Customer registration complete: ${username} linked to Fresh Catch business`);

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

export async function addMembershipWithJoinCode(code: string) {
  const { ctx, response } = requestInfo;

  // Must be logged in
  if (!ctx.user) {
    return { success: false, error: "You must be logged in" };
  }

  // Validate code & determine role
  const role = code === env.ADMIN_CODE ? "owner" :
               code === env.MANAGER_CODE ? "manager" : null;
  if (!role) {
    return { success: false, error: "Invalid join code" };
  }

  // Find Fresh Catch organization
  const freshCatchOrg = await db.organization.findFirst({
    where: { name: "Fresh Catch Seafood Markets" },
  });

  if (!freshCatchOrg) {
    return { success: false, error: "Organization not found" };
  }

  // Check if already a member
  const existingMembership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.user.id,
        organizationId: freshCatchOrg.id,
      },
    },
  });

  if (existingMembership) {
    // Already a member - update role if different
    if (existingMembership.role !== role) {
      await db.membership.update({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: freshCatchOrg.id,
          },
        },
        data: { role },
      });
      console.log(`✅ Updated ${ctx.user.username}'s role to ${role}`);
    } else {
      console.log(`User ${ctx.user.username} already has ${role} role`);
    }
  } else {
    // Add new membership
    await db.membership.create({
      data: {
        userId: ctx.user.id,
        organizationId: freshCatchOrg.id,
        role: role,
      },
    });
    console.log(`✅ Added ${ctx.user.username} as ${role}`);
  }

  // Update session to Fresh Catch org context
  await sessions.save(response.headers, {
    userId: ctx.user.id,
    currentOrganizationId: freshCatchOrg.id,
    role: role,
  });

  return { success: true, role };
}

export async function finishJoinCodeRegistration(
  username: string,
  email: string,
  code: string,
  registration: RegistrationResponseJSON,
) {
  const { request, response } = requestInfo;
  const { origin } = new URL(request.url);

  // 1. Verify WebAuthn challenge (same as finishPasskeyRegistration)
  const session = await sessions.load(request);
  const challenge = session?.challenge;
  if (!challenge) return { success: false };

  const verification = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { success: false };
  }

  await sessions.save(response.headers, { challenge: null });

  // 2. Validate code & determine role
  const role = code === env.ADMIN_CODE ? "owner" :
               code === env.MANAGER_CODE ? "manager" : null;
  if (!role) return { success: false };

  // 3. Check if username already exists
  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log(`Join failed: Username '${username}' already exists`);
    return { success: false };
  }

  // 4. Create User + Credential
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

  // 5. Create individual organization (like customer flow)
  const individualOrg = await db.organization.create({
    data: {
      name: `${username}'s Account`,
      slug: crypto.randomUUID(),
      type: "individual",
    },
  });

  await db.membership.create({
    data: {
      userId: user.id,
      organizationId: individualOrg.id,
      role: "owner",
    },
  });

  // 6. Link to Fresh Catch Seafood Markets with admin role
  const freshCatchOrg = await db.organization.findFirst({
    where: { name: "Fresh Catch Seafood Markets" },
  });

  if (!freshCatchOrg) {
    throw new Error("Fresh Catch organization not found");
  }

  await db.membership.create({
    data: {
      userId: user.id,
      organizationId: freshCatchOrg.id,
      role: role, // 'owner' or 'manager' from code
    },
  });

  // 7. Auto-login with Fresh Catch org context (admin dashboard)
  await sessions.save(response.headers, {
    userId: user.id,
    currentOrganizationId: freshCatchOrg.id,
    role: role,
  });

  console.log(`✅ Join code registration: ${username} added as ${role}`);

  return { success: true, isAdmin: true };
}
