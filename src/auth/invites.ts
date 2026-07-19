import { db } from "@/db";

const ROLE_RANK: Record<string, number> = { owner: 2, manager: 1 };

/**
 * Accept a pending invite for a user. Returns invite info or null.
 * Role changes are upgrade-only — an invite never downgrades an
 * existing membership.
 */
export async function processInviteToken(userId: string, userEmail: string, inviteToken: string) {
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
