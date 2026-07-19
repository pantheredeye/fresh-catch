import { describe, expect, it, afterAll } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

// Auth/ownership tests for the chat security holes closed in functions.ts:
//   - saveCustomerEmail: ownership check on claimed conversations
//   - createConversation: org must exist AND be a "business" (vendor) org
//
// The test bridge runs these with an empty ctx (no session/user), i.e. as an
// anonymous caller — exactly the untrusted client the checks defend against.

const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  for (const id of orgIds) await vitestInvoke("deleteOrgCascade", id);
  await vitestInvoke("deleteUsers", userIds);
});

type SaveResult = { success: boolean; error?: string };

describe("saveCustomerEmail authorization", () => {
  it("rejects writing a claimed conversation from an unauthenticated caller", async () => {
    const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `authz-${crypto.randomUUID()}`);
    orgIds.push(org.id);
    const owner = await vitestInvoke<{ id: string }>("seedUser", `owner-${crypto.randomUUID()}@x.com`);
    userIds.push(owner.id);

    // Conversation already claimed by `owner`.
    const conv = await vitestInvoke<{ id: string }>("seedConversation", org.id, owner.id);

    const r = await vitestInvoke<SaveResult>("saveCustomerEmail", conv.id, "attacker@evil.com");

    expect(r.success).toBe(false);
    // Owned conversation is untouched — email never written.
    expect(await vitestInvoke("getConversationEmail", conv.id)).toBeNull();
  });

  it("allows saving on an anonymous conversation (UUID-as-bearer path)", async () => {
    const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `authz-${crypto.randomUUID()}`);
    orgIds.push(org.id);

    const conv = await vitestInvoke<{ id: string }>("seedConversation", org.id, null);

    const r = await vitestInvoke<SaveResult>("saveCustomerEmail", conv.id, "customer@example.com");

    expect(r).toEqual({ success: true });
    expect(await vitestInvoke("getConversationEmail", conv.id)).toBe("customer@example.com");
  });
});

describe("createConversation vendor validation", () => {
  it("rejects a nonexistent organizationId", async () => {
    await expect(
      vitestInvoke("createConversation", {
        customerName: "Mallory",
        organizationId: crypto.randomUUID(),
      }),
    ).rejects.toThrow("Invalid vendor");
  });

  it("rejects a non-business (individual) organizationId and creates nothing", async () => {
    const indiv = await vitestInvoke<{ id: string }>("seedIndividualOrg", `indiv-${crypto.randomUUID()}`);
    orgIds.push(indiv.id);

    await expect(
      vitestInvoke("createConversation", {
        customerName: "Mallory",
        organizationId: indiv.id,
      }),
    ).rejects.toThrow("Invalid vendor");

    expect(await vitestInvoke<number>("countConversationsForOrg", indiv.id)).toBe(0);
  });

  it("creates an anonymous conversation for a valid business org", async () => {
    const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `authz-${crypto.randomUUID()}`);
    orgIds.push(org.id);

    const result = await vitestInvoke<{ conversationId: string }>("createConversation", {
      customerName: "Ada",
      organizationId: org.id,
    });

    expect(typeof result.conversationId).toBe("string");
    // Bridge caller is unauthenticated, so the conversation is anonymous.
    expect(await vitestInvoke("getConversationCustomer", result.conversationId)).toBeNull();
  });
});
