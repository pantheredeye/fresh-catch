"use server";

import { requestInfo } from "rwsdk/worker";
import { sessions } from "@/session/store";
import { db } from "@/db";

export async function listUserOrganizations() {
  const { ctx } = requestInfo;

  if (!ctx.user) {
    throw new Error("Must be logged in");
  }

  const memberships = await db.membership.findMany({
    where: {
      userId: ctx.user.id,
      organization: { type: "business" },
    },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));
}

export async function switchOrganization(orgId: string) {
  const { ctx, response } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "Must be logged in" };
  }

  const membership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.user.id,
        organizationId: orgId,
      },
    },
    include: { organization: { select: { type: true } } },
  });

  if (!membership || membership.organization.type !== "business") {
    return { success: false, error: "No membership for this organization" };
  }

  // Update session with new org context
  await sessions.save(response.headers, {
    userId: ctx.user.id,
    currentOrganizationId: orgId,
    role: membership.role,
  });

  // Touch membership updatedAt for most-recently-used sorting
  await db.membership.update({
    where: { id: membership.id },
    data: { updatedAt: new Date() },
  });

  return { success: true };
}
