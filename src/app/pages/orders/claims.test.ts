import { describe, expect, it, afterAll } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

const orgIds: string[] = [];
const userIds: string[] = [];

async function seedOrgAndUser() {
  const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `order-claims-${crypto.randomUUID()}`);
  orgIds.push(org.id);
  const user = await vitestInvoke<{ id: string }>("seedUser", `c-${crypto.randomUUID()}@x.com`);
  userIds.push(user.id);
  return { org, user };
}

afterAll(async () => {
  for (const id of orgIds) await vitestInvoke("deleteOrgCascade", id);
  await vitestInvoke("deleteUsers", userIds);
});

describe("claimOrdersForUser", () => {
  it("claims a userId:null order matching the email", async () => {
    const { org, user } = await seedOrgAndUser();
    const email = `guest-${crypto.randomUUID()}@x.com`;
    const order = await vitestInvoke<{ id: string }>("seedGuestOrder", org.id, "Guest", email);

    const result = await vitestInvoke<{ claimed: number }>("claimOrdersForUser", user.id, email);

    expect(result.claimed).toBe(1);
    expect(await vitestInvoke("getOrderUser", order.id)).toBe(user.id);
  });

  it("leaves another user's order with the same email untouched", async () => {
    const { org, user } = await seedOrgAndUser();
    const otherUser = await vitestInvoke<{ id: string }>("seedUser", `o-${crypto.randomUUID()}@x.com`);
    userIds.push(otherUser.id);
    const email = `guest-${crypto.randomUUID()}@x.com`;

    const order = await vitestInvoke<{ id: string }>("seedGuestOrder", org.id, "Guest", email);
    await vitestInvoke("claimOrdersForUser", otherUser.id, email);

    const result = await vitestInvoke<{ claimed: number }>("claimOrdersForUser", user.id, email);

    expect(result.claimed).toBe(0);
    expect(await vitestInvoke("getOrderUser", order.id)).toBe(otherUser.id);
  });

  it("matches case-insensitively when the order was stored normalized", async () => {
    const { org, user } = await seedOrgAndUser();
    const normalized = `foo-${crypto.randomUUID()}@bar.com`;
    const order = await vitestInvoke<{ id: string }>("seedGuestOrder", org.id, "Guest", normalized);

    // Login typed with different casing — claimOrdersForUser normalizes the input.
    const typedAtLogin = normalized.replace("foo", "Foo").replace("bar.com", "Bar.COM");
    const result = await vitestInvoke<{ claimed: number }>("claimOrdersForUser", user.id, typedAtLogin);

    expect(result.claimed).toBe(1);
    expect(await vitestInvoke("getOrderUser", order.id)).toBe(user.id);
  });

  it("returns zero for a non-matching email", async () => {
    const { org, user } = await seedOrgAndUser();
    await vitestInvoke("seedGuestOrder", org.id, "Guest", `other-${crypto.randomUUID()}@x.com`);

    const result = await vitestInvoke<{ claimed: number }>(
      "claimOrdersForUser",
      user.id,
      `nomatch-${crypto.randomUUID()}@x.com`,
    );

    expect(result.claimed).toBe(0);
  });

  it("creates a vendor customer membership when claiming", async () => {
    const { org, user } = await seedOrgAndUser();
    const email = `guest-${crypto.randomUUID()}@x.com`;
    await vitestInvoke("seedGuestOrder", org.id, "Guest", email);

    await vitestInvoke("claimOrdersForUser", user.id, email);

    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBe("customer");
  });
});
