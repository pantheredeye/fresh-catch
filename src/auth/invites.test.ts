import { describe, expect, it, afterAll } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type InviteResult = { organizationId: string; orgName: string; role: string } | null;

const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(name: string) {
  const org = await vitestInvoke<{ id: string; name: string }>("seedBusinessOrg", name);
  orgIds.push(org.id);
  const inviter = await vitestInvoke<{ id: string }>("seedUser", `inviter-${crypto.randomUUID()}@x.com`);
  userIds.push(inviter.id);
  return { org, inviter };
}

async function newUser() {
  const u = await vitestInvoke<{ id: string; email: string }>(
    "seedUser",
    `u-${crypto.randomUUID()}@x.com`,
  );
  userIds.push(u.id);
  return u;
}

afterAll(async () => {
  for (const id of orgIds) await vitestInvoke("deleteOrgCascade", id);
  await vitestInvoke("deleteUsers", userIds);
});

describe("processInviteToken", () => {
  it("accepts a matching pending invite and creates the membership", async () => {
    const { org, inviter } = await setup("Invite Accept Co");
    const user = await newUser();
    const { token } = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "manager",
      email: user.email,
    });

    const result = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      token,
    );
    expect(result?.role).toBe("manager");

    const role = await vitestInvoke<string | null>("getMembershipRole", user.id, org.id);
    expect(role).toBe("manager");

    const invite = await vitestInvoke<{ status: string; acceptedBy: string } | null>(
      "getInviteStatus",
      token,
    );
    expect(invite?.status).toBe("accepted");
    expect(invite?.acceptedBy).toBe(user.id);
  });

  it("upgrades manager to owner but never downgrades owner to manager", async () => {
    const { org, inviter } = await setup("Invite Upgrade Co");
    const user = await newUser();
    await vitestInvoke("seedMembership", user.id, org.id, "manager");

    // Upgrade manager -> owner.
    const up = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "owner",
      email: user.email,
    });
    const upResult = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      up.token,
    );
    expect(upResult?.role).toBe("owner");
    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBe("owner");

    // A later manager invite must NOT downgrade the owner.
    const down = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "manager",
      email: user.email,
    });
    const downResult = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      down.token,
    );
    expect(downResult?.role).toBe("owner");
    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBe("owner");
  });

  it("rejects an invite whose email does not match the user", async () => {
    const { org, inviter } = await setup("Invite Wrong Email Co");
    const user = await newUser();
    const { token } = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "manager",
      email: "someone-else@x.com",
    });

    const result = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      token,
    );
    expect(result).toBeNull();
    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBeNull();
  });

  it("rejects an expired invite", async () => {
    const { org, inviter } = await setup("Invite Expired Co");
    const user = await newUser();
    const { token } = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "manager",
      email: user.email,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const result = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      token,
    );
    expect(result).toBeNull();
    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBeNull();
  });

  it("rejects an already-accepted (used) invite", async () => {
    const { org, inviter } = await setup("Invite Used Co");
    const user = await newUser();
    const { token } = await vitestInvoke<{ token: string }>("seedInvite", {
      organizationId: org.id,
      invitedBy: inviter.id,
      role: "manager",
      email: user.email,
      status: "accepted",
    });

    const result = await vitestInvoke<InviteResult>(
      "processInviteToken",
      user.id,
      user.email,
      token,
    );
    expect(result).toBeNull();
    expect(await vitestInvoke("getMembershipRole", user.id, org.id)).toBeNull();
  });
});
