import { DurableObject } from "cloudflare:workers";
import { db, setupDb } from "@/db";
import { sendChatReplyNotificationEmail } from "@/utils/email";

const EMAIL_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

interface SendMessage {
  type: "message";
  content: string;
  senderType: "customer" | "vendor";
  senderId?: string;
}

interface OutgoingMessage {
  type: "message";
  id: string;
  content: string;
  senderType: string;
  senderId: string | null;
  createdAt: string;
}

interface HistoryPayload {
  type: "history";
  messages: OutgoingMessage[];
}

export class ChatDurableObject extends DurableObject {
  private conversationId: string | null = null;
  private lastEmailSentAt: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private getConversationId(request: Request): string {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    // Expect /ws/chat/:conversationId
    return parts[parts.length - 1];
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    await setupDb(this.env);

    this.conversationId = this.getConversationId(request);

    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "customer";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [role]);

    // Send history to the new connection
    const messages = await db.message.findMany({
      where: { conversationId: this.conversationId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const historyPayload: HistoryPayload = {
      type: "history",
      messages: messages.map((m) => ({
        type: "message" as const,
        id: m.id,
        content: m.content,
        senderType: m.senderType,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
      })),
    };

    server.send(JSON.stringify(historyPayload));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") return;

    await setupDb(this.env);

    let parsed: SendMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (parsed.type !== "message" || !parsed.content || !parsed.senderType) {
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid message format" }),
      );
      return;
    }

    // Use the DO name as conversationId if not set from fetch
    if (!this.conversationId) {
      // Fallback: retrieve from the first connected socket or DO id
      this.conversationId = this.ctx.id.toString();
    }

    // Persist message to D1
    const created = await db.message.create({
      data: {
        conversationId: this.conversationId,
        content: parsed.content,
        senderType: parsed.senderType,
        senderId: parsed.senderId ?? null,
      },
    });

    // Update conversation lastMessageAt
    await db.conversation.update({
      where: { id: this.conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    // Notify customer via email if offline
    if (parsed.senderType === "vendor") {
      const customerSockets = this.ctx.getWebSockets("customer");
      if (customerSockets.length === 0) {
        const now = Date.now();
        if (now - this.lastEmailSentAt > EMAIL_DEBOUNCE_MS) {
          const conversation = await db.conversation.findUnique({
            where: { id: this.conversationId },
            include: { organization: true },
          });
          if (conversation?.customerEmail) {
            try {
              await sendChatReplyNotificationEmail({
                to: conversation.customerEmail,
                customerName: conversation.customerName,
                vendorName: conversation.organization.name,
                messagePreview:
                  parsed.content.length > 100
                    ? parsed.content.slice(0, 100) + "…"
                    : parsed.content,
                chatPath: `/${conversation.organization.slug}/chat/${conversation.id}`,
                businessName: conversation.organization.name,
              });
              this.lastEmailSentAt = now;
            } catch (err) {
              console.error("[ChatDO] Failed to send notification email:", err);
            }
          }
        }
      }
    }

    // Broadcast to all other connected WebSockets
    const outgoing: OutgoingMessage = {
      type: "message",
      id: created.id,
      content: created.content,
      senderType: created.senderType,
      senderId: created.senderId,
      createdAt: created.createdAt.toISOString(),
    };

    const payload = JSON.stringify(outgoing);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(payload);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    ws.close(1011, "WebSocket error");
  }
}
