import { describe, expect, it, afterAll } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

const orgIds: string[] = [];
const userIds: string[] = [];

async function seedOrgAndUser() {
  const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `claims-${crypto.randomUUID()}`);
  orgIds.push(org.id);
  const user = await vitestInvoke<{ id: string }>("seedUser", `c-${crypto.randomUUID()}@x.com`);
  userIds.push(user.id);
  return { org, user };
}

afterAll(async () => {
  for (const id of orgIds) await vitestInvoke("deleteOrgCascade", id);
  await vitestInvoke("deleteUsers", userIds);
});

describe("claimConversationsForUser", () => {
  it("claims only anonymous conversations, never one owned by someone else", async () => {
    const { org, user } = await seedOrgAndUser();
    const otherUser = await vitestInvoke<{ id: string }>("seedUser", `o-${crypto.randomUUID()}@x.com`);
    userIds.push(otherUser.id);

    const anon = await vitestInvoke<{ id: string }>("seedConversation", org.id, null);
    const owned = await vitestInvoke<{ id: string }>("seedConversation", org.id, otherUser.id);

    const result = await vitestInvoke<{ claimed: number }>(
      "claimConversationsForUser",
      user.id,
      [anon.id, owned.id],
    );

    expect(result.claimed).toBe(1);
    expect(await vitestInvoke("getConversationCustomer", anon.id)).toBe(user.id);
    // The other user's conversation is untouched.
    expect(await vitestInvoke("getConversationCustomer", owned.id)).toBe(otherUser.id);
  });

  it("returns zero for an empty id list", async () => {
    const { user } = await seedOrgAndUser();
    const result = await vitestInvoke<{ claimed: number }>(
      "claimConversationsForUser",
      user.id,
      [],
    );
    expect(result.claimed).toBe(0);
  });
});
