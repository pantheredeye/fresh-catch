"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { isOwner } from "@/utils/permissions";
import { sessions, resilientDO } from "@/session/store";
import { requireCsrf } from "@/session/csrf";

function assertOwner() {
  const { ctx } = requestInfo;
  if (!ctx.user || !ctx.currentOrganization || !isOwner(ctx)) {
    throw new Error("Not authorized");
  }
  return { userId: ctx.user.id, orgId: ctx.currentOrganization.id };
}

export async function createInvite(csrfToken: string, data: { email?: string; role: string }) {
  requireCsrf(csrfToken);

  const { userId, orgId } = assertOwner();

  if (!["owner", "manager"].includes(data.role)) {
    return { success: false, error: "Invalid role" };
  }

  // Check for existing pending invite with same email+org
  if (data.email) {
    const existing = await db.invite.findFirst({
      where: {
        organizationId: orgId,
        email: data.email,
        status: "pending",
      },
    });
    if (existing) {
      return { success: true, invite: existing };
    }
  }

  const invite = await db.invite.create({
    data: {
      organizationId: orgId,
      email: data.email || null,
      role: data.role,
      token: crypto.randomUUID(),
      invitedBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { success: true, invite };
}

export async function revokeInvite(csrfToken: string, inviteId: string) {
  requireCsrf(csrfToken);

  const { orgId } = assertOwner();

  const invite = await db.invite.findFirst({
    where: { id: inviteId, organizationId: orgId, status: "pending" },
  });

  if (!invite) {
    return { success: false, error: "Invite not found" };
  }

  await db.invite.update({
    where: { id: inviteId },
    data: { status: "revoked" },
  });

  return { success: true };
}

export async function changeRole(csrfToken: string, membershipId: string, newRole: string) {
  requireCsrf(csrfToken);

  const { orgId } = assertOwner();

  if (!["owner", "manager"].includes(newRole)) {
    return { success: false, error: "Invalid role" };
  }

  const membership = await db.membership.findFirst({
    where: { id: membershipId, organizationId: orgId },
  });

  if (!membership) {
    return { success: false, error: "Member not found" };
  }

  // Last owner protection
  if (membership.role === "owner" && newRole !== "owner") {
    const ownerCount = await db.membership.count({
      where: { organizationId: orgId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot demote the last owner" };
    }
  }

  await db.membership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });

  return { success: true };
}

export async function removeMember(csrfToken: string, membershipId: string) {
  requireCsrf(csrfToken);

  const { orgId } = assertOwner();

  const membership = await db.membership.findFirst({
    where: { id: membershipId, organizationId: orgId },
  });

  if (!membership) {
    return { success: false, error: "Member not found" };
  }

  // Last owner protection
  if (membership.role === "owner") {
    const ownerCount = await db.membership.count({
      where: { organizationId: orgId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the last owner" };
    }
  }

  await db.membership.delete({
    where: { id: membershipId },
  });

  return { success: true };
}

export async function acceptInvite(csrfToken: string, token: string) {
  requireCsrf(csrfToken);

  const { ctx, response } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "Must be logged in" };
  }

  const invite = await db.invite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.status !== "pending") {
    return { success: false, error: "Invalid or expired invite" };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, error: "This invite has expired" };
  }

  // Validate email match if invite specifies an email
  if (invite.email) {
    const userEmail = ctx.user.email?.toLowerCase();
    const inviteEmail = invite.email.toLowerCase();
    if (!userEmail || userEmail !== inviteEmail) {
      return {
        success: false,
        error: `This invite was sent to ${invite.email}. Please log in with that email to accept.`,
      };
    }
  }

  // Check if already a member
  const existingMembership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.user.id,
        organizationId: invite.organizationId,
      },
    },
  });

  const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, manager: 1 };

  if (existingMembership) {
    const currentRank = ROLE_RANK[existingMembership.role] ?? 0;
    const inviteRank = ROLE_RANK[invite.role] ?? 0;
    // Only upgrade, never downgrade
    if (inviteRank > currentRank) {
      await db.membership.update({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: invite.organizationId,
          },
        },
        data: { role: invite.role },
      });
    }
  } else {
    await db.membership.create({
      data: {
        userId: ctx.user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });
  }

  // Mark invite as accepted
  await db.invite.update({
    where: { id: invite.id },
    data: { status: "accepted", acceptedBy: ctx.user.id },
  });

  // Update session to this org context — use the effective role (may be higher than invite)
  const effectiveRole = existingMembership
    ? (ROLE_RANK[existingMembership.role] ?? 0) >= (ROLE_RANK[invite.role] ?? 0)
      ? existingMembership.role
      : invite.role
    : invite.role;
  const userId = ctx.user!.id;
  await resilientDO(() => sessions.save(response.headers, {
    userId,
    currentOrganizationId: invite.organizationId,
    role: effectiveRole,
  }), "acceptInvite.save");

  return { success: true, orgName: invite.organization.name };
}
