import { DurableObject } from "cloudflare:workers";
import { db, setupDb } from "@/db";

interface ConversationSummary {
  id: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  lastMessagePreview: string | null;
  lastMessageSenderType: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

interface InboxPayload {
  type: "inbox";
  unreadCount: number;
  conversations: ConversationSummary[];
}

export class InboxDurableObject extends DurableObject {
  private alarmPending = false;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    await setupDb(this.env);

    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId");
    if (!orgId) {
      return new Response("Missing orgId", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [orgId]);

    // Send current inbox state immediately
    const payload = await this.buildInboxPayload(orgId);
    server.send(JSON.stringify(payload));

    return new Response(null, { status: 101, webSocket: client });
  }

  /** Called by ChatDO and server functions to trigger a push */
  async notify(): Promise<void> {
    if (this.alarmPending) return;
    this.alarmPending = true;
    await this.ctx.storage.setAlarm(Date.now() + 500);
  }

  async alarm(): Promise<void> {
    this.alarmPending = false;
    await setupDb(this.env);

    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;

    // All sockets for this DO share the same org (DO is keyed by orgId)
    const tags = this.ctx.getTags(sockets[0]);
    const orgId = tags[0];
    if (!orgId) return;

    const payload = await this.buildInboxPayload(orgId);
    const msg = JSON.stringify(payload);
    for (const socket of sockets) {
      socket.send(msg);
    }
  }

  private async buildInboxPayload(orgId: string): Promise<InboxPayload> {
    const conversations = await db.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const conversationIds = conversations.map((c) => c.id);

    const unreadCounts =
      conversationIds.length > 0
        ? await db.message.groupBy({
            by: ["conversationId"],
            where: {
              conversationId: { in: conversationIds },
              senderType: "customer",
              readAt: null,
            },
            _count: { id: true },
          })
        : [];

    const countMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count.id]),
    );

    let totalUnread = 0;
    const summaries: ConversationSummary[] = conversations.map((conv) => {
      const lastMessage = conv.messages[0] ?? null;
      const unread = countMap.get(conv.id) ?? 0;
      totalUnread += unread;
      return {
        id: conv.id,
        customerName: conv.customerName,
        customerPhone: conv.customerPhone,
        status: conv.status,
        lastMessagePreview: lastMessage?.content ?? null,
        lastMessageSenderType: lastMessage?.senderType ?? null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unread,
      };
    });

    return { type: "inbox", unreadCount: totalUnread, conversations: summaries };
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, "closing");
    } catch {
      // already closed
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close(1011, "WebSocket error");
  }
}
