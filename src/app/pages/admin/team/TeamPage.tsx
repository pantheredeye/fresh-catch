import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { isOwner } from "@/utils/permissions";
import { TeamUI } from "./TeamUI";
import { NotAuthenticated, AccessDenied } from "../components";

export async function TeamPage({ ctx, request }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!ctx.currentOrganization || !isOwner(ctx)) {
    return <AccessDenied message="Only business owners can manage team members." />;
  }

  const orgId = ctx.currentOrganization.id;

  const members = await db.membership.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["owner", "manager"] },
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const pendingInvites = await db.invite.findMany({
    where: {
      organizationId: orgId,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = new URL(request.url).origin;

  return (
    <TeamUI
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.userId,
        userName: m.user.name || m.user.username,
        userEmail: m.user.email || m.user.username,
      }))}
      pendingInvites={pendingInvites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        createdAt: inv.createdAt.toISOString(),
      }))}
      currentUserId={ctx.user.id}
      baseUrl={baseUrl}
      csrfToken={ctx.session!.csrfToken}
    />
  );
}
