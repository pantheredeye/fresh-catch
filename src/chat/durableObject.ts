import { DurableObject } from "cloudflare:workers";
import { db, setupDb } from "@/db";
import { sendChatReplyNotificationEmail } from "@/utils/email";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { generateAiResponse } from "./ai-agent";

const EMAIL_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

interface SendMessage {
  type: "message";
  content: string;
  senderType: "customer" | "vendor";
  senderId?: string;
}

interface PresencePayload {
  type: "vendor-presence";
  vendorOnline: boolean;
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
  /** When true, vendor has taken over this conversation — suppress AI replies */
  private vendorTakeover: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Restore takeover flag from DO storage (survives evictions)
    this.ctx.blockConcurrencyWhile(async () => {
      this.vendorTakeover =
        (await this.ctx.storage.get<boolean>("vendorTakeover")) ?? false;
    });
  }

  private getConversationId(request: Request): string {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    // Expect /ws/chat/:conversationId
    return parts[parts.length - 1];
  }

  /** Check if any vendor WebSocket connections are active */
  isVendorOnline(): boolean {
    return this.ctx.getWebSockets("vendor").length > 0;
  }

  /** Broadcast vendor presence state to all customer sockets */
  private broadcastVendorPresence(): void {
    const payload: PresencePayload = {
      type: "vendor-presence",
      vendorOnline: this.isVendorOnline(),
    };
    const msg = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets("customer")) {
      socket.send(msg);
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Non-WebSocket: presence query endpoint
    if (request.headers.get("Upgrade") !== "websocket") {
      const url = new URL(request.url);
      if (url.searchParams.get("presence") === "1") {
        return Response.json({ vendorOnline: this.isVendorOnline() });
      }
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

    // If vendor just connected, notify customers
    if (role === "vendor") {
      this.broadcastVendorPresence();
    }

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

    // Vendor takeover: suppress AI when vendor sends a message
    if (parsed.senderType === "vendor" && !this.vendorTakeover) {
      this.vendorTakeover = true;
      await this.ctx.storage.put("vendorTakeover", true);
    }

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
                chatPath: `/v/${conversation.organization.slug}?chat=${conversation.id}`,
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

    // AI auto-reply: if customer message + vendor offline + no takeover
    if (parsed.senderType === "customer" && !this.isVendorOnline() && !this.vendorTakeover) {
      try {
        const apiKey = (this.env as unknown as Record<string, string>).ANTHROPIC_API_KEY;
        if (apiKey) {
          await this.handleAiResponse(parsed.content, apiKey);
        }
      } catch (err) {
        console.error("[ChatDO] AI response failed:", err);
      }
    }
  }

  /** Generate and broadcast an AI response for an offline vendor */
  private async handleAiResponse(
    customerMessage: string,
    apiKey: string,
  ): Promise<void> {
    if (!this.conversationId) return;

    // Load conversation with org context
    const conversation = await db.conversation.findUnique({
      where: { id: this.conversationId },
      include: { organization: true },
    });
    if (!conversation) return;

    // Build conversation history from recent messages
    const recentMessages = await db.message.findMany({
      where: { conversationId: this.conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const conversationHistory: MessageParam[] = recentMessages
      .slice(0, -1) // exclude the just-sent customer message
      .map((m) => ({
        role: (m.senderType === "customer" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: m.content,
      }));

    // Get McpDO stub for this org
    const mcpId = this.env.MCP_DURABLE_OBJECT.idFromName(conversation.organizationId);
    const mcpStub = this.env.MCP_DURABLE_OBJECT.get(mcpId);

    // Check budget before any API call
    const budget = await mcpStub.checkBudget();
    if (!budget.allowed) {
      const vendorName = conversation.organization.name;
      const budgetMsg = `I can't help right now, please message ${vendorName} directly.`;
      const aiMessage = await db.message.create({
        data: {
          conversationId: this.conversationId,
          content: budgetMsg,
          senderType: "ai",
          senderId: null,
        },
      });
      await db.conversation.update({
        where: { id: this.conversationId },
        data: { lastMessageAt: aiMessage.createdAt },
      });
      const aiOutgoing: OutgoingMessage = {
        type: "message",
        id: aiMessage.id,
        content: aiMessage.content,
        senderType: aiMessage.senderType,
        senderId: aiMessage.senderId,
        createdAt: aiMessage.createdAt.toISOString(),
      };
      for (const socket of this.ctx.getWebSockets()) {
        socket.send(JSON.stringify(aiOutgoing));
      }
      return;
    }

    // Check response cache before calling Claude API
    const cached = await mcpStub.getCachedResponse(customerMessage);
    if (cached !== null) {
      // Cache hit — skip Claude API call entirely
      const aiMessage = await db.message.create({
        data: {
          conversationId: this.conversationId,
          content: cached,
          senderType: "ai",
          senderId: null,
        },
      });
      await db.conversation.update({
        where: { id: this.conversationId },
        data: { lastMessageAt: aiMessage.createdAt },
      });
      const aiOutgoing: OutgoingMessage = {
        type: "message",
        id: aiMessage.id,
        content: aiMessage.content,
        senderType: aiMessage.senderType,
        senderId: aiMessage.senderId,
        createdAt: aiMessage.createdAt.toISOString(),
      };
      const aiPayload = JSON.stringify(aiOutgoing);
      for (const socket of this.ctx.getWebSockets()) {
        socket.send(aiPayload);
      }
      return;
    }

    const result = await generateAiResponse({
      apiKey,
      customerMessage,
      conversationHistory,
      orgContext: {
        organizationId: conversation.organizationId,
        orgName: conversation.organization.name,
        customerName: conversation.customerName,
        customerEmail: conversation.customerEmail,
      },
    });

    // Record token usage and cache successful responses
    if (result.ok) {
      try {
        mcpStub.recordApiUsage({
          model: result.model,
          complexity: result.complexity,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
      } catch (err) {
        console.error("[ChatDO] Failed to record API usage:", err);
      }
      try {
        mcpStub.cacheResponse(customerMessage, result.text);
      } catch (err) {
        console.error("[ChatDO] Failed to cache response:", err);
      }
    }

    // Log gap if AI couldn't answer
    if (!result.ok) {
      try {
        mcpStub.logGap({
          conversation_id: this.conversationId!,
          question: customerMessage,
          reason: result.gapReason,
        });
      } catch (err) {
        console.error("[ChatDO] Failed to log gap:", err);
      }
    }

    // Persist AI message
    const aiMessage = await db.message.create({
      data: {
        conversationId: this.conversationId,
        content: result.text,
        senderType: "ai",
        senderId: null,
      },
    });

    await db.conversation.update({
      where: { id: this.conversationId },
      data: { lastMessageAt: aiMessage.createdAt },
    });

    // Broadcast AI message to all connected sockets
    const aiOutgoing: OutgoingMessage = {
      type: "message",
      id: aiMessage.id,
      content: aiMessage.content,
      senderType: aiMessage.senderType,
      senderId: aiMessage.senderId,
      createdAt: aiMessage.createdAt.toISOString(),
    };

    const aiPayload = JSON.stringify(aiOutgoing);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(aiPayload);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    const tags = this.ctx.getTags(ws);
    ws.close(code, reason);
    // If a vendor disconnected, clear takeover and broadcast presence
    if (tags.includes("vendor")) {
      // Only clear if no other vendor sockets remain
      if (!this.isVendorOnline()) {
        this.vendorTakeover = false;
        this.ctx.storage.put("vendorTakeover", false);
      }
      this.broadcastVendorPresence();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const tags = this.ctx.getTags(ws);
    ws.close(1011, "WebSocket error");
    if (tags.includes("vendor")) {
      if (!this.isVendorOnline()) {
        this.vendorTakeover = false;
        this.ctx.storage.put("vendorTakeover", false);
      }
      this.broadcastVendorPresence();
    }
  }
}
