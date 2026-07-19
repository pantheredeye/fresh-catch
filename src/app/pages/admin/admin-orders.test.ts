import { describe, expect, it, afterAll } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

const orgIds: string[] = [];

afterAll(async () => {
  for (const id of orgIds) await vitestInvoke("deleteOrgCascade", id);
});

describe("admin order visibility", () => {
  it("includes guest orders (userId null) in the admin order list", async () => {
    const org = await vitestInvoke<{ id: string }>("seedBusinessOrg", `orders-${crypto.randomUUID()}`);
    orgIds.push(org.id);

    const guest = await vitestInvoke<{ id: string }>("seedGuestOrder", org.id, "Walk-in Guest");

    const visible = await vitestInvoke<string[]>("adminVisibleOrderIds", org.id);
    expect(visible).toContain(guest.id);

    // Regression guard: the old `user: { deletedAt: null }` clause dropped it.
    const legacy = await vitestInvoke<string[]>("adminVisibleOrderIdsLegacy", org.id);
    expect(legacy).not.toContain(guest.id);
  });
});
