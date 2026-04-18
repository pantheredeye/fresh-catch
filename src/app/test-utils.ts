import { db } from "@/db";

export async function seedBusinessOrg(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return db.organization.create({
    data: { name, slug, type: "business" },
  });
}

export async function deleteOrgCascade(orgId: string) {
  await db.order.deleteMany({ where: { organizationId: orgId } });
  await db.market.deleteMany({ where: { organizationId: orgId } });
  await db.catchUpdate.deleteMany({ where: { organizationId: orgId } });
  await db.membership.deleteMany({ where: { organizationId: orgId } });
  await db.organization.delete({ where: { id: orgId } });
}

export async function countOrders(orgId: string) {
  return db.order.count({ where: { organizationId: orgId } });
}
