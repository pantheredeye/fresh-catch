import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { db, setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import type { RequestInput } from "./validation";
import {
  appendMessage,
  canViewRequest,
  claimRequestsForUser,
  createRequest,
  getRequestWithMessages,
  listInbox,
  listRequestsForViewer,
  needsReply,
  setRequestStatus,
} from "./queries";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

async function createUser(): Promise<string> {
  const user = await db.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
  return user.id;
}

function fishInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    requestType: "fish",
    species: "Halibut",
    quantity: "2 lbs",
    notes: null,
    contactName: "Jamie",
    contactEmail: null,
    contactPhone: null,
    ...overrides,
  };
}

describe("createRequest", () => {
  it("creates an opening customer message and sets lastMessageAt", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(fishInput(), { deviceToken, userId: null });
    expect(request.lastMessageAt).not.toBeNull();

    const withMessages = await getRequestWithMessages(request.id);
    expect(withMessages?.messages).toHaveLength(1);
    expect(withMessages?.messages[0].sender).toBe("customer");
    expect(withMessages?.messages[0].body).toContain("Halibut");
  });

  it("nulls species/quantity for a question request", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(
      fishInput({ requestType: "question", species: null, quantity: null, notes: "Any salmon this week?" }),
      { deviceToken, userId: null },
    );
    expect(request.species).toBeNull();
    expect(request.quantity).toBeNull();
  });
});

describe("appendMessage", () => {
  it("bumps lastMessageAt on reply", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(fishInput(), { deviceToken, userId: null });
    const firstLastMessageAt = request.lastMessageAt;

    await new Promise((r) => setTimeout(r, 5));
    await appendMessage(request.id, "vendor", "We have some in this week.");

    const updated = await getRequestWithMessages(request.id);
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.lastMessageAt?.getTime()).toBeGreaterThan(firstLastMessageAt!.getTime());
  });
});

describe("listInbox", () => {
  it("orders active statuses by lastMessageAt desc and excludes archived by default", async () => {
    const deviceToken = crypto.randomUUID();
    const open = await createRequest(fishInput({ species: `Open ${crypto.randomUUID()}` }), { deviceToken, userId: null });
    const confirmed = await createRequest(fishInput({ species: `Confirmed ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: null,
    });
    await setRequestStatus(confirmed.id, "confirmed");
    const declined = await createRequest(fishInput({ species: `Declined ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: null,
    });
    await setRequestStatus(declined.id, "declined");

    await new Promise((r) => setTimeout(r, 5));
    await appendMessage(confirmed.id, "vendor", "bumping this one");

    const active = await listInbox("active");
    const activeIds = active.map((r) => r.id);
    expect(activeIds).toContain(open.id);
    expect(activeIds).toContain(confirmed.id);
    expect(activeIds).not.toContain(declined.id);
    expect(activeIds.indexOf(confirmed.id)).toBeLessThan(activeIds.indexOf(open.id));

    const archive = await listInbox("archive");
    expect(archive.map((r) => r.id)).toContain(declined.id);
    expect(archive.map((r) => r.id)).not.toContain(open.id);

    const all = await listInbox("all");
    expect(all.map((r) => r.id)).toEqual(expect.arrayContaining([open.id, confirmed.id, declined.id]));
  });

  it("includes only the newest message, used to derive needsReply", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(fishInput({ species: `NeedsReply ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: null,
    });
    let [entry] = (await listInbox("all")).filter((r) => r.id === request.id);
    expect(needsReply(entry)).toBe(true);

    await appendMessage(request.id, "vendor", "On it.");
    [entry] = (await listInbox("all")).filter((r) => r.id === request.id);
    expect(entry.messages).toHaveLength(1);
    expect(needsReply(entry)).toBe(false);
  });
});

describe("listRequestsForViewer", () => {
  it("matches on device token and on user id", async () => {
    const deviceToken = crypto.randomUUID();
    const userId = await createUser();
    const byDevice = await createRequest(fishInput({ species: `ByDevice ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: null,
    });
    const byUser = await createRequest(fishInput({ species: `ByUser ${crypto.randomUUID()}` }), {
      deviceToken: crypto.randomUUID(),
      userId,
    });

    const viaDevice = await listRequestsForViewer({ deviceToken, userId: null });
    expect(viaDevice.map((r) => r.id)).toContain(byDevice.id);

    const viaUser = await listRequestsForViewer({ deviceToken: crypto.randomUUID(), userId });
    expect(viaUser.map((r) => r.id)).toContain(byUser.id);
  });

  it("returns nothing for an anonymous viewer with no identity", async () => {
    expect(await listRequestsForViewer({ deviceToken: null, userId: null })).toEqual([]);
  });
});

describe("claimRequestsForUser", () => {
  it("only claims rows with no userId already attached", async () => {
    const deviceToken = crypto.randomUUID();
    const unclaimed = await createRequest(fishInput({ species: `Unclaimed ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: null,
    });
    const existingOwnerId = await createUser();
    const alreadyOwned = await createRequest(fishInput({ species: `AlreadyOwned ${crypto.randomUUID()}` }), {
      deviceToken,
      userId: existingOwnerId,
    });

    const claimingUserId = await createUser();
    await claimRequestsForUser(deviceToken, claimingUserId);

    const afterUnclaimed = await getRequestWithMessages(unclaimed.id);
    const afterOwned = await getRequestWithMessages(alreadyOwned.id);
    expect(afterUnclaimed?.userId).toBe(claimingUserId);
    expect(afterOwned?.userId).not.toBe(claimingUserId);
  });
});

describe("canViewRequest", () => {
  const request = { deviceToken: "device-a", userId: "user-a", origin: "customer" };

  it("allows admin regardless of identity", () => {
    expect(canViewRequest(request, { deviceToken: "other", userId: null, isAdmin: true })).toBe(true);
  });

  it("allows a matching device token or user id", () => {
    expect(canViewRequest(request, { deviceToken: "device-a", userId: null, isAdmin: false })).toBe(true);
    expect(canViewRequest(request, { deviceToken: "other", userId: "user-a", isAdmin: false })).toBe(true);
  });

  it("denies a mismatched viewer", () => {
    expect(canViewRequest(request, { deviceToken: "other", userId: "other-user", isAdmin: false })).toBe(false);
  });

  it("allows any viewer on a vendor-initiated thread (deep link is the access control)", () => {
    const vendorRequest = { deviceToken: null, userId: null, origin: "vendor" };
    expect(canViewRequest(vendorRequest, { deviceToken: "anyone", userId: null, isAdmin: false })).toBe(true);
  });
});
