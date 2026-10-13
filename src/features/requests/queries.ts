import { db } from "@/lib/db";
import { randomToken, timingSafeEqual } from "@/lib/tokens";
import type { FishRequest, RequestItem, RequestMessage } from "@/lib/db";
import type { OrderWithPayments } from "@/features/orders/queries";
import { MAX_REQUEST_ITEMS } from "./validation";
import type { ItemResolutionInput, RequestInput, RequestStatus } from "./validation";

export type MessageSender = "customer" | "vendor";

export type InboxEntry = FishRequest & { messages: RequestMessage[] };

/** "Halibut — 2 lb (bled)" — the one-line item rendering shared by opening messages, header cards, and emails. */
export function requestItemLine(item: { species: string; quantity: string | null; notes: string | null }): string {
  const headline = item.quantity ? `${item.species} — ${item.quantity}` : item.species;
  return item.notes ? `${headline} (${item.notes})` : headline;
}

/** One line per item ("Halibut — 2 lb"), then the order-level notes paragraph. */
function openingMessageBody(data: RequestInput): string {
  if (data.requestType === "question") return data.notes ?? "";
  const lines = data.items.map(requestItemLine).join("\n");
  return data.notes ? `${lines}\n\n${data.notes}` : lines;
}

export type RequestOrigin = "customer" | "vendor";

/**
 * Creates the request, its items, and its opening message in one call — a
 * thread never starts empty. `species`/`quantity` on FishRequest are the
 * denormalized headline (= item 0) and `itemCount` = items.length, so inbox
 * rows/titles/emails need no join (#102). `origin: "vendor"` is #64's second
 * entry point (Evan's "New request" button): no device token, opening message
 * is `sender: "vendor"`, and it's born `status: "confirmed"` instead of the
 * default `"open"`. Every request gets a fresh `accessToken` (#131) — the
 * secret in emailed thread links.
 */
export async function createRequest(
  data: RequestInput,
  identity: { deviceToken: string | null; userId: string | null },
  options: { origin?: RequestOrigin; status?: RequestStatus } = {},
): Promise<FishRequest> {
  const { items, ...fields } = data;
  if (data.requestType === "fish" && (items.length === 0 || items.length > MAX_REQUEST_ITEMS)) {
    throw new Error(`A fish request needs 1–${MAX_REQUEST_ITEMS} items, got ${items.length}`);
  }
  const origin = options.origin ?? "customer";
  const status = options.status ?? "open";
  const sender: MessageSender = origin === "vendor" ? "vendor" : "customer";
  const now = new Date();
  const request = await db.fishRequest.create({
    data: {
      ...fields,
      species: items[0]?.species ?? null,
      quantity: items[0]?.quantity ?? null,
      itemCount: items.length,
      deviceToken: identity.deviceToken,
      userId: identity.userId,
      accessToken: randomToken(),
      origin,
      status,
      lastMessageAt: now,
    },
  });
  if (items.length > 0) {
    await db.requestItem.createMany({
      data: items.map((item, position) => ({
        requestId: request.id,
        position,
        species: item.species,
        quantity: item.quantity,
        notes: item.notes,
        isCustom: item.isCustom,
      })),
    });
  }
  await db.requestMessage.create({
    data: { requestId: request.id, sender, body: openingMessageBody(data), createdAt: now },
  });
  return request;
}

export function getRequest(id: string): Promise<FishRequest | null> {
  return db.fishRequest.findUnique({ where: { id } });
}

/** The thread's items in display order — for callers holding a bare FishRequest (emails, order snapshots). */
export function listRequestItems(requestId: string): Promise<RequestItem[]> {
  return db.requestItem.findMany({ where: { requestId }, orderBy: { position: "asc" } });
}

/**
 * Writes Evan's per-item resolution (#106). `requestId` in the where clause
 * is the backstop against a crafted POST carrying another thread's item ids —
 * rows that don't belong simply match nothing.
 */
export async function updateItemResolutions(requestId: string, resolutions: ItemResolutionInput[]): Promise<void> {
  for (const resolution of resolutions) {
    await db.requestItem.updateMany({
      where: { id: resolution.id, requestId },
      data: {
        status: resolution.status,
        priceCents: resolution.priceCents,
        marketRate: resolution.marketRate,
        vendorNote: resolution.vendorNote,
      },
    });
  }
}

export type RequestWithMessages = FishRequest & {
  items: RequestItem[];
  messages: RequestMessage[];
  order: OrderWithPayments | null;
};

/** Order summary card (#65) needs the linked order + its payment ledger alongside the thread. */
export function getRequestWithMessages(id: string): Promise<RequestWithMessages | null> {
  return db.fishRequest.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      order: { include: { payments: { orderBy: { createdAt: "desc" } } } },
    },
  });
}

/** Customer "my requests" — OR of device token and account, so a claimed request still shows up post-login. */
export function listRequestsForViewer(identity: { deviceToken: string | null; userId: string | null }): Promise<FishRequest[]> {
  const conditions: Array<{ deviceToken: string } | { userId: string }> = [];
  if (identity.deviceToken) conditions.push({ deviceToken: identity.deviceToken });
  if (identity.userId) conditions.push({ userId: identity.userId });
  if (conditions.length === 0) return Promise.resolve([]);

  return db.fishRequest.findMany({ where: { OR: conditions }, orderBy: { createdAt: "desc" } });
}

export type InboxFilter = "active" | "all" | "archive";

const ACTIVE_STATUSES: RequestStatus[] = ["open", "confirmed"];
const ARCHIVE_STATUSES: RequestStatus[] = ["fulfilled", "declined"];

/** Default admin view is open+confirmed only (plan addendum #4); `all`/`archive` are the other two filter states. */
export function listInbox(filter: InboxFilter): Promise<InboxEntry[]> {
  const status = filter === "all" ? undefined : { in: filter === "archive" ? ARCHIVE_STATUSES : ACTIVE_STATUSES };
  return db.fishRequest.findMany({
    where: status ? { status } : {},
    orderBy: { lastMessageAt: "desc" },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
  });
}

export function countOpenRequests(): Promise<number> {
  return db.fishRequest.count({ where: { status: "open" } });
}

export async function appendMessage(requestId: string, sender: MessageSender, body: string): Promise<RequestMessage> {
  const now = new Date();
  const message = await db.requestMessage.create({ data: { requestId, sender, body, createdAt: now } });
  await db.fishRequest.update({ where: { id: requestId }, data: { lastMessageAt: now } });
  return message;
}

export function setRequestStatus(id: string, status: RequestStatus): Promise<FishRequest> {
  return db.fishRequest.update({ where: { id }, data: { status } });
}

/** R3: login claims the device's anonymous requests — only rows not already attached to an account. */
export async function claimRequestsForUser(deviceToken: string, userId: string): Promise<number> {
  const { count } = await db.fishRequest.updateMany({ where: { deviceToken, userId: null }, data: { userId } });
  return count;
}

/**
 * #131: a secret thread link was opened — make the thread findable from here
 * without stealing it from anyone. Logged in → claim it if unclaimed; else
 * adopt it onto this device only if no device owns it yet (vendor-origin
 * walk-ups). Never overwrites another device's or account's ownership.
 * Admins (Evan checking a customer's link) never take ownership.
 */
export async function attachRequestToViewer(
  request: Pick<FishRequest, "id" | "deviceToken" | "userId">,
  viewer: { deviceToken: string; userId: string | null; isAdmin: boolean },
): Promise<void> {
  if (viewer.isAdmin) return;
  if (viewer.userId) {
    if (!request.userId) {
      await db.fishRequest.updateMany({ where: { id: request.id, userId: null }, data: { userId: viewer.userId } });
    }
    return;
  }
  if (!request.deviceToken && !request.userId) {
    await db.fishRequest.updateMany({
      where: { id: request.id, deviceToken: null, userId: null },
      data: { deviceToken: viewer.deviceToken },
    });
  }
}

/** Constant-time check of a presented thread-link token (#131). */
export function accessTokenMatches(request: Pick<FishRequest, "accessToken">, presented: string | null | undefined): boolean {
  return !!presented && timingSafeEqual(request.accessToken, presented);
}

/**
 * R2: device token OR session user OR admin OR the thread's secret link token
 * (#131). A bare unguessable id in the URL is not itself authorization —
 * vendor-origin threads (#64) used to be the exception; their emailed link
 * now carries the access token instead. The token opens this one thread
 * only; it never widens `listRequestsForViewer`.
 */
export function canViewRequest(
  request: Pick<FishRequest, "deviceToken" | "userId" | "accessToken">,
  viewer: { deviceToken: string; userId: string | null; isAdmin: boolean; accessToken?: string | null },
): boolean {
  if (viewer.isAdmin) return true;
  if (request.userId && request.userId === viewer.userId) return true;
  if (request.deviceToken && request.deviceToken === viewer.deviceToken) return true;
  if (accessTokenMatches(request, viewer.accessToken)) return true;
  return false;
}

/** R6: "needs reply" is derived from the latest message, never stored. */
export function needsReply(entry: Pick<InboxEntry, "messages">): boolean {
  return entry.messages[0]?.sender === "customer";
}
