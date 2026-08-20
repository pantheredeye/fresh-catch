import { db } from "@/db";
import { normalizeEmail } from "@/auth/login-codes";

/**
 * Attach guest orders to a user on login, matched by email. Only fills
 * userId where it is still null — never reassigns an order that already
 * belongs to someone. Also links the user to each vendor org the claimed
 * orders belong to, mirroring the membership upsert in createOrder.
 */
export async function claimOrdersForUser(userId: string, email: string) {
  const emails = [normalizeEmail(email), email.trim()];

  const matchingOrders = await db.order.findMany({
    where: { userId: null, contactEmail: { in: emails } },
    select: { organizationId: true },
  });
  if (matchingOrders.length === 0) return { claimed: 0 };

  const result = await db.order.updateMany({
    where: { userId: null, contactEmail: { in: emails } },
    data: { userId },
  });

  const orgIds = [...new Set(matchingOrders.map((o) => o.organizationId))];
  for (const organizationId of orgIds) {
    await db.membership.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {},
      create: { userId, organizationId, role: "customer" },
    });
  }

  return { claimed: result.count };
}
