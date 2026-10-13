import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { db, setupDb } from "@/lib/db";
import type { Bindings } from "@/types";
import { MAX_REQUEST_ITEMS } from "./validation";
import type { RequestInput, RequestItemInput } from "./validation";
import {
  accessTokenMatches,
  appendMessage,
  attachRequestToViewer,
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

function item(species: string, overrides: Partial<RequestItemInput> = {}): RequestItemInput {
  return { species, quantity: "2 lbs", notes: null, isCustom: false, ...overrides };
}

function fishInput(overrides: Partial<RequestInput> & { species?: string } = {}): RequestInput {
  const { species, ...rest } = overrides;
  return {
    requestType: "fish",
    items: [item(species ?? "Halibut")],
    notes: null,
    contactName: "Jamie",
    contactEmail: null,
    contactPhone: null,
    ...rest,
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

  it("nulls species/quantity and writes no items for a question request", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(
      fishInput({ requestType: "question", items: [], notes: "Any salmon this week?" }),
      { deviceToken, userId: null },
    );
    expect(request.species).toBeNull();
    expect(request.quantity).toBeNull();
    expect(request.itemCount).toBe(0);
    expect(await db.requestItem.count({ where: { requestId: request.id } })).toBe(0);
  });

  it("writes one RequestItem per item, in position order, with the first as headline", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(
      fishInput({
        items: [
          item("Halibut", { quantity: "2 lb" }),
          item("Grouper", { quantity: null, notes: "fillet please" }),
          item("Wahoo", { isCustom: true }),
        ],
        notes: "Pickup Saturday",
      }),
      { deviceToken, userId: null },
    );

    expect(request.species).toBe("Halibut");
    expect(request.quantity).toBe("2 lb");
    expect(request.itemCount).toBe(3);

    const withItems = await getRequestWithMessages(request.id);
    expect(withItems?.items.map((i) => [i.position, i.species])).toEqual([
      [0, "Halibut"],
      [1, "Grouper"],
      [2, "Wahoo"],
    ]);
    expect(withItems?.items[1].notes).toBe("fillet please");
    expect(withItems?.items[2].isCustom).toBe(true);
    // Vendor-side fields start unset: no price until Evan replies with an estimate.
    expect(withItems?.items.every((i) => i.status === "requested" && i.priceCents === null && !i.marketRate)).toBe(true);
  });

  it("lists every item in the opening message", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(
      fishInput({
        items: [item("Halibut", { quantity: "2 lb" }), item("Grouper", { quantity: null, notes: "fillet please" })],
        notes: "Pickup Saturday",
      }),
      { deviceToken, userId: null },
    );
    const withMessages = await getRequestWithMessages(request.id);
    expect(withMessages?.messages[0].body).toBe("Halibut — 2 lb\nGrouper (fillet please)\n\nPickup Saturday");
  });

  it("rejects a fish request with zero items or more than the max", async () => {
    const identity = { deviceToken: crypto.randomUUID(), userId: null };
    await expect(createRequest(fishInput({ items: [] }), identity)).rejects.toThrow(/items/);
    const tooMany = Array.from({ length: MAX_REQUEST_ITEMS + 1 }, (_, i) => item(`Fish ${i}`));
    await expect(createRequest(fishInput({ items: tooMany }), identity)).rejects.toThrow(/items/);
  });

  it("deletes items with their request (cascade)", async () => {
    const deviceToken = crypto.randomUUID();
    const request = await createRequest(fishInput({ items: [item("Halibut"), item("Grouper")] }), {
      deviceToken,
      userId: null,
    });
    await db.requestMessage.deleteMany({ where: { requestId: request.id } });
    await db.fishRequest.delete({ where: { id: request.id } });
    expect(await db.requestItem.count({ where: { requestId: request.id } })).toBe(0);
  });
});

describe("migration 0007 backfill", () => {
  it("creates a position-0 item for a legacy fish request without rows", async () => {
    // Legacy-shaped row: headline columns set, no RequestItem rows — what the
    // pre-#102 schema held. itemCount keeps the column default (1), matching
    // what existing fish rows have after the migration.
    const legacy = await db.fishRequest.create({
      data: {
        contactName: "Jamie",
        requestType: "fish",
        species: "Snapper",
        quantity: "1 whole",
        accessToken: crypto.randomUUID(),
      },
    });

    // Mirrors the backfill statement in migrations/0007_request_items.sql —
    // its NOT EXISTS guard makes it a no-op for requests that already have items.
    await db.$executeRaw`
      INSERT INTO "RequestItem" ("id", "requestId", "position", "species", "quantity")
      SELECT lower(hex(randomblob(16))), "id", 0, "species", "quantity"
      FROM "FishRequest"
      WHERE "requestType" = 'fish' AND "species" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "RequestItem" ri WHERE ri."requestId" = "FishRequest"."id")`;

    const items = await db.requestItem.findMany({ where: { requestId: legacy.id } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      position: 0,
      species: "Snapper",
      quantity: "1 whole",
      isCustom: false,
      status: "requested",
      priceCents: null,
    });

    // Running it again stays a no-op.
    await db.$executeRaw`
      INSERT INTO "RequestItem" ("id", "requestId", "position", "species", "quantity")
      SELECT lower(hex(randomblob(16))), "id", 0, "species", "quantity"
      FROM "FishRequest"
      WHERE "requestType" = 'fish' AND "species" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "RequestItem" ri WHERE ri."requestId" = "FishRequest"."id")`;
    expect(await db.requestItem.count({ where: { requestId: legacy.id } })).toBe(1);
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
    expect(await claimRequestsForUser(deviceToken, claimingUserId)).toBe(1);
    expect(await claimRequestsForUser(deviceToken, claimingUserId)).toBe(0);

    const afterUnclaimed = await getRequestWithMessages(unclaimed.id);
    const afterOwned = await getRequestWithMessages(alreadyOwned.id);
    expect(afterUnclaimed?.userId).toBe(claimingUserId);
    expect(afterOwned?.userId).not.toBe(claimingUserId);
  });
});

describe("canViewRequest", () => {
  const request = { deviceToken: "device-a", userId: "user-a", accessToken: "secret-a" };

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

  it("allows the thread's access token, and only that token (#131)", () => {
    const stranger = { deviceToken: "other", userId: null, isAdmin: false };
    expect(canViewRequest(request, { ...stranger, accessToken: "secret-a" })).toBe(true);
    expect(canViewRequest(request, { ...stranger, accessToken: "secret-b" })).toBe(false);
    expect(canViewRequest(request, { ...stranger, accessToken: "" })).toBe(false);
    expect(canViewRequest(request, { ...stranger, accessToken: null })).toBe(false);
  });

  it("no longer opens an owner-less vendor thread by bare id (#131)", () => {
    const vendorRequest = { deviceToken: null, userId: null, accessToken: "secret-v" };
    expect(canViewRequest(vendorRequest, { deviceToken: "anyone", userId: null, isAdmin: false })).toBe(false);
  });
});

describe("request access tokens (#131)", () => {
  it("gives every request a distinct 256-bit base64url token", async () => {
    const a = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const b = await createRequest(fishInput(), { deviceToken: null, userId: null }, { origin: "vendor" });
    expect(a.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.accessToken).not.toBe(b.accessToken);
    expect(accessTokenMatches(a, a.accessToken)).toBe(true);
    expect(accessTokenMatches(a, b.accessToken)).toBe(false);
    expect(accessTokenMatches(a, undefined)).toBe(false);
  });

  it("is unique at the database level (migration 0008)", async () => {
    const a = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    const b = await createRequest(fishInput(), { deviceToken: crypto.randomUUID(), userId: null });
    await expect(db.fishRequest.update({ where: { id: b.id }, data: { accessToken: a.accessToken } })).rejects.toThrow();
  });
});

describe("attachRequestToViewer (#131)", () => {
  async function user(): Promise<string> {
    return (await db.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } })).id;
  }

  it("adopts an owner-less thread onto the opening device", async () => {
    const request = await createRequest(fishInput(), { deviceToken: null, userId: null }, { origin: "vendor" });
    const deviceToken = crypto.randomUUID();
    await attachRequestToViewer(request, { deviceToken, userId: null, isAdmin: false });
    expect((await db.fishRequest.findUnique({ where: { id: request.id } }))?.deviceToken).toBe(deviceToken);
  });

  it("never moves a thread off another device", async () => {
    const owner = crypto.randomUUID();
    const request = await createRequest(fishInput(), { deviceToken: owner, userId: null });
    await attachRequestToViewer(request, { deviceToken: crypto.randomUUID(), userId: null, isAdmin: false });
    expect((await db.fishRequest.findUnique({ where: { id: request.id } }))?.deviceToken).toBe(owner);
  });

  it("claims an unclaimed thread for a logged-in viewer, keeping the original device", async () => {
    const owner = crypto.randomUUID();
    const userId = await user();
    const request = await createRequest(fishInput(), { deviceToken: owner, userId: null });
    await attachRequestToViewer(request, { deviceToken: crypto.randomUUID(), userId, isAdmin: false });
    const after = await db.fishRequest.findUnique({ where: { id: request.id } });
    expect(after).toMatchObject({ userId, deviceToken: owner });
  });

  it("never reassigns a claimed thread, and admins never take ownership", async () => {
    const ownerId = await user();
    const claimed = await createRequest(fishInput(), { deviceToken: null, userId: ownerId });
    await attachRequestToViewer(claimed, { deviceToken: crypto.randomUUID(), userId: await user(), isAdmin: false });
    expect((await db.fishRequest.findUnique({ where: { id: claimed.id } }))?.userId).toBe(ownerId);

    const vendorThread = await createRequest(fishInput(), { deviceToken: null, userId: null }, { origin: "vendor" });
    await attachRequestToViewer(vendorThread, { deviceToken: crypto.randomUUID(), userId: await user(), isAdmin: true });
    expect(await db.fishRequest.findUnique({ where: { id: vendorThread.id } })).toMatchObject({
      userId: null,
      deviceToken: null,
    });
  });
});
