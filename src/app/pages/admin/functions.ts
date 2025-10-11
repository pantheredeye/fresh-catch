"use server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { sessions } from "@/session/store";
import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { env } from "cloudflare:workers";

/**
 * Admin Business Owner Registration Functions
 *
 * DESIGN DECISIONS:
 *
 * 1. **Separate Admin Functions** (vs extending user functions)
 *    - Decision: Dedicated admin registration functions
 *    - Context: Different logic needed (link existing user/org vs create new)
 *    - Rationale: Clear separation of concerns, admin-specific validation
 *
 * 2. **Existing User/Organization Linking Strategy**
 *    - Decision: Find and link existing entities vs always create new
 *    - Context: Evan's business already seeded, need credential-only registration
 *    - Implementation: findUnique for user/org, create credential, verify membership
 *    - Rationale: Preserves seed data, handles existing business scenarios
 *
 * 3. **Duplicate Registration Prevention**
 *    - Decision: Check for existing credentials before creating new ones
 *    - Context: Prevent multiple credentials for same user
 *    - Implementation: findUnique check with early return
 *    - Rationale: Data integrity, clear error messaging
 *
 * 4. **Organization Auto-Creation Logic**
 *    - Decision: Create organization if business name doesn't exist
 *    - Context: Support new business registration in same flow
 *    - Implementation: findFirst by name, create if not found
 *    - Rationale: Flexibility for future business onboarding
 */

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

export async function startBusinessOwnerRegistration(username: string) {
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

export async function finishBusinessOwnerRegistration(
  username: string,
  businessName: string,
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

  // Look for existing user with this username
  let user = await db.user.findUnique({
    where: { username },
  });

  // If user doesn't exist, create them
  if (!user) {
    user = await db.user.create({
      data: { username },
    });
  }

  // Check if user already has a credential (prevent duplicate registrations)
  const existingCredential = await db.credential.findUnique({
    where: { userId: user.id },
  });

  if (existingCredential) {
    console.log(`User ${username} already has a credential`);
    return false;
  }

  // Add the credential to the user
  await db.credential.create({
    data: {
      userId: user.id,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
  });

  // Look for existing organization with this business name
  let organization = await db.organization.findFirst({
    where: { name: businessName },
  });

  // If organization doesn't exist, create it
  if (!organization) {
    // Generate slug from business name (lowercase, replace spaces/special chars with dashes)
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

    organization = await db.organization.create({
      data: {
        name: businessName,
        slug: slug,
        type: "business",
      },
    });
  }

  // Check if user is already a member of this organization
  const existingMembership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
  });

  // If not already a member, make them the owner
  if (!existingMembership) {
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
      },
    });
  }

  // Auto-login: Create session with user and organization context
  await sessions.save(response.headers, {
    userId: user.id,
    currentOrganizationId: organization.id,
    role: existingMembership?.role || "owner",
  });

  console.log(`✅ Business owner setup complete for ${username} at ${businessName}`);
  return true;
}