import { db } from "@/lib/db";
import type { FishRequest, RequestMessage } from "@/lib/db";
import type { OrderWithPayments } from "@/features/orders/queries";
import type { RequestInput, RequestStatus } from "./validation";

export type MessageSender = "customer" | "vendor";

export type InboxEntry = FishRequest & { messages: RequestMessage[] };

function openingMessageBody(data: RequestInput): string {
  if (data.requestType === "question") return data.notes ?? "";
  const headline = data.quantity ? `${data.species} — ${data.quantity}` : `${data.species}`;
  return data.notes ? `${headline}\n\n${data.notes}` : headline;
}

export type RequestOrigin = "customer" | "vendor";

/**
 * Creates the request and its opening message in one call — a thread never
 * starts empty. `origin: "vendor"` is #64's second entry point (Evan's
 * "New request" button): no device token, opening message is `sender:
 * "vendor"`, and it's born `status: "confirmed"` instead of the default
 * `"open"`.
 */
export async function createRequest(
  data: RequestInput,
  identity: { deviceToken: string | null; userId: string | null },
  options: { origin?: RequestOrigin; status?: RequestStatus } = {},
): Promise<FishRequest> {
  const origin = options.origin ?? "customer";
  const status = options.status ?? "open";
  const sender: MessageSender = origin === "vendor" ? "vendor" : "customer";
  const now = new Date();
  const request = await db.fishRequest.create({
    data: {
      ...data,
      deviceToken: identity.deviceToken,
      userId: identity.userId,
      origin,
      status,
      lastMessageAt: now,
    },
  });
  await db.requestMessage.create({
    data: { requestId: request.id, sender, body: openingMessageBody(data), createdAt: now },
  });
  return request;
}

export function getRequest(id: string): Promise<FishRequest | null> {
  return db.fishRequest.findUnique({ where: { id } });
}

export type RequestWithMessages = FishRequest & { messages: RequestMessage[]; order: OrderWithPayments | null };

/** Order summary card (#65) needs the linked order + its payment ledger alongside the thread. */
export function getRequestWithMessages(id: string): Promise<RequestWithMessages | null> {
  return db.fishRequest.findUnique({
    where: { id },
    include: {
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
export async function claimRequestsForUser(deviceToken: string, userId: string): Promise<void> {
  await db.fishRequest.updateMany({ where: { deviceToken, userId: null }, data: { userId } });
}

/**
 * R2: device token OR session user OR admin. A bare unguessable id in the
 * URL is not itself authorization — except for `origin: "vendor"` threads
 * (#64), which are created with no device token or account at all; the
 * emailed deep link to the unguessable id *is* the access control, since
 * that's the only way a walk-up customer without an account reaches it.
 */
export function canViewRequest(
  request: Pick<FishRequest, "deviceToken" | "userId" | "origin">,
  viewer: { deviceToken: string; userId: string | null; isAdmin: boolean },
): boolean {
  if (viewer.isAdmin) return true;
  if (request.origin === "vendor") return true;
  if (request.userId && request.userId === viewer.userId) return true;
  if (request.deviceToken && request.deviceToken === viewer.deviceToken) return true;
  return false;
}

/** R6: "needs reply" is derived from the latest message, never stored. */
export function needsReply(entry: Pick<InboxEntry, "messages">): boolean {
  return entry.messages[0]?.sender === "customer";
}
