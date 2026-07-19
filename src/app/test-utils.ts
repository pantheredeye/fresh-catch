import { db } from "@/db";
import { normalizeEmail } from "@/auth/login-codes";

// --- Re-exports of plain-module internals under test -----------------------
// These live in non-"use server" modules so they can be invoked directly by
// the vitest bridge without becoming remote server actions.
export { createLoginCode, verifyLoginCode } from "@/auth/login-codes";
export { processInviteToken } from "@/auth/invites";
export { claimConversationsForUser } from "@/chat/claims";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Org / user seeding ----------------------------------------------------

export async function seedBusinessOrg(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return db.organization.create({
    data: { name, slug, type: "business" },
  });
}

export async function seedIndividualOrg(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return db.organization.create({
    data: { name, slug, type: "individual" },
  });
}

export async function seedUser(email: string) {
  return db.user.create({
    data: { username: email, email },
  });
}

export async function seedMembership(userId: string, organizationId: string, role: string) {
  return db.membership.create({ data: { userId, organizationId, role } });
}

export async function getMembershipRole(userId: string, organizationId: string) {
  const m = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  return m?.role ?? null;
}

// --- Invite seeding / inspection -------------------------------------------

export async function seedInvite(opts: {
  organizationId: string;
  invitedBy: string;
  role: string;
  email?: string | null;
  status?: string;
  expiresAt?: string | null; // ISO string; JSON has no Date
}) {
  const token = crypto.randomUUID();
  await db.invite.create({
    data: {
      organizationId: opts.organizationId,
      invitedBy: opts.invitedBy,
      role: opts.role,
      email: opts.email ?? null,
      token,
      status: opts.status ?? "pending",
      expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : null,
    },
  });
  return { token };
}

export async function getInviteStatus(token: string) {
  const invite = await db.invite.findUnique({ where: { token } });
  return invite ? { status: invite.status, acceptedBy: invite.acceptedBy } : null;
}

// --- Login-code inspection -------------------------------------------------

/** Backdate an email's active login code so verify sees it as expired. */
export async function expireLoginCode(email: string) {
  const emailHash = await sha256Hex(normalizeEmail(email));
  await db.loginCode.update({
    where: { emailHash },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}

// --- Conversation seeding / inspection -------------------------------------

export async function seedConversation(organizationId: string, customerId: string | null) {
  const c = await db.conversation.create({
    data: {
      organizationId,
      customerId,
      customerName: "Test Customer",
    },
  });
  return { id: c.id };
}

export async function getConversationCustomer(id: string) {
  const c = await db.conversation.findUnique({ where: { id } });
  return c?.customerId ?? null;
}

export async function getConversationEmail(id: string) {
  const c = await db.conversation.findUnique({ where: { id } });
  return c?.customerEmail ?? null;
}

export async function countConversationsForOrg(organizationId: string) {
  return db.conversation.count({ where: { organizationId } });
}

// --- Order seeding / admin-query mirror ------------------------------------

export async function seedGuestOrder(organizationId: string, contactName: string) {
  const count = await db.order.count({ where: { organizationId } });
  const o = await db.order.create({
    data: {
      organizationId,
      orderNumber: count + 1,
      userId: null,
      contactName,
      items: "1x snapper",
    },
  });
  return { id: o.id };
}

/**
 * Mirror of the AdminOrdersPage/PrintOrdersPage where-clause. Returns the
 * order ids an admin would see: everyone's orders except soft-deleted users',
 * INCLUDING guest orders (userId null).
 */
export async function adminVisibleOrderIds(organizationId: string) {
  const orders = await db.order.findMany({
    where: {
      organizationId,
      OR: [{ userId: null }, { user: { deletedAt: null } }],
    },
    select: { id: true },
  });
  return orders.map((o) => o.id);
}

/**
 * The pre-fix where-clause (`user: { deletedAt: null }` alone). Prisma applies
 * `is` semantics to the to-one relation, so orders with no user (guest orders)
 * are silently excluded. Kept only to prove the regression the OR clause fixes.
 */
export async function adminVisibleOrderIdsLegacy(organizationId: string) {
  const orders = await db.order.findMany({
    where: { organizationId, user: { deletedAt: null } },
    select: { id: true },
  });
  return orders.map((o) => o.id);
}

// --- Cleanup ---------------------------------------------------------------

export async function deleteOrgCascade(orgId: string) {
  await db.order.deleteMany({ where: { organizationId: orgId } });
  await db.market.deleteMany({ where: { organizationId: orgId } });
  await db.catchUpdate.deleteMany({ where: { organizationId: orgId } });
  await db.conversation.deleteMany({ where: { organizationId: orgId } });
  await db.invite.deleteMany({ where: { organizationId: orgId } });
  await db.membership.deleteMany({ where: { organizationId: orgId } });
  await db.organization.delete({ where: { id: orgId } });
}

export async function deleteUsers(userIds: string[]) {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function countOrders(orgId: string) {
  return db.order.count({ where: { organizationId: orgId } });
}
