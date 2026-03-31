"use server";

import { requestInfo } from "rwsdk/worker";
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
