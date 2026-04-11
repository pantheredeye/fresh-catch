import { DurableObject } from "cloudflare:workers";
import { db, setupDb } from "@/db";
import { sendChatReplyNotificationEmail } from "@/utils/email";
import type { ChatMessage } from "@/ai/workers-ai-client";
import { generateAiResponse } from "./ai-agent";
import { handleListCatch, handleGetMarkets, handleGetVendorPopups } from "@/api/tool-handlers";
import { formatToolResult } from "./tool-formatter";

const BATCH_ALARM_MS = 15 * 60 * 1000; // 15 minutes

interface SendMessage {
  type: "message";
  content: string;
  senderType: "customer" | "vendor";
  senderId?: string;
}

interface AiActionMessage {
  type: "ai-action";
  tool: string;
  args: Record<string, unknown>;
}

interface AiQueryMessage {
  type: "ai-query";
  content: string;
}

const ALLOWED_QUICK_TOOLS: Record<string, (rawInput: unknown, orgId: string) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>> = {
  list_catch: handleListCatch,
  get_markets: handleGetMarkets,
  get_vendor_popups: handleGetVendorPopups,
};

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
  vendorOnline: boolean;
}

export class ChatDurableObject extends DurableObject {
  private conversationId: string | null = null;
  /** When true, vendor has taken over this conversation — suppress AI replies */
  private vendorTakeover: boolean = false;
  private conversationVerified: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
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
    this.conversationVerified = false;

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
      vendorOnline: this.isVendorOnline(),
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

    // If customer reconnected, cancel pending email alarm
    if (role === "customer") {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.delete("pendingEmailMessages");
    }

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

    let raw: { type?: string };
    try {
      raw = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // Route ai-action messages to the quick-action handler
    if (raw.type === "ai-action") {
      await this.handleQuickAction(ws, raw as AiActionMessage);
      return;
    }

    // Route ai-query messages (customer opted into AI mode)
    if (raw.type === "ai-query") {
      await this.handleAiQuery(ws, raw as AiQueryMessage);
      return;
    }

    const parsed = raw as SendMessage;

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

    // Verify conversation exists in D1 (guards against replication lag)
    if (!this.conversationVerified) {
      const conv = await db.conversation.findUnique({
        where: { id: this.conversationId },
        select: { id: true },
      });
      if (!conv) {
        ws.send(JSON.stringify({ type: "error", message: "Conversation not ready. Please retry." }));
        ws.close(4000, "Conversation not found");
        return;
      }
      this.conversationVerified = true;
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

    // Queue email notification if customer is offline
    if (parsed.senderType === "vendor") {
      const customerSockets = this.ctx.getWebSockets("customer");
      if (customerSockets.length === 0) {
        const preview = parsed.content.length > 100
          ? parsed.content.slice(0, 100) + "…"
          : parsed.content;
        const pending = (await this.ctx.storage.get<string[]>("pendingEmailMessages")) ?? [];
        pending.push(preview);
        await this.ctx.storage.put("pendingEmailMessages", pending);
        // Set alarm only if this is the first pending message
        if (pending.length === 1) {
          await this.ctx.storage.setAlarm(Date.now() + BATCH_ALARM_MS);
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

    // Signal: fire-and-forget customer interaction to Signal Agent
    if (parsed.senderType === "customer" && this.conversationId) {
      try {
        const conv = await db.conversation.findUnique({
          where: { id: this.conversationId },
          select: { organizationId: true },
        });
        if (conv) {
          const signalId = this.env.SIGNAL_DURABLE_OBJECT.idFromName(conv.organizationId);
          this.env.SIGNAL_DURABLE_OBJECT.get(signalId).ingest({
            type: "chat", source: "websocket", content: parsed.content,
            role: "customer", orgId: conv.organizationId, timestamp: Date.now(),
          }).catch(() => {});
        }
      } catch {}
    }

  }

  /** Handle customer-initiated AI query (Ask AI mode) */
  private async handleAiQuery(
    ws: WebSocket,
    query: AiQueryMessage,
  ): Promise<void> {
    if (!this.conversationId || !query.content?.trim()) return;

    // Verify conversation exists
    if (!this.conversationVerified) {
      const conv = await db.conversation.findUnique({
        where: { id: this.conversationId },
        select: { id: true },
      });
      if (!conv) {
        ws.send(JSON.stringify({ type: "error", message: "Conversation not ready." }));
        return;
      }
      this.conversationVerified = true;
    }

    // Persist customer message to D1
    const customerMsg = await db.message.create({
      data: {
        conversationId: this.conversationId,
        content: query.content,
        senderType: "customer",
        senderId: null,
      },
    });

    await db.conversation.update({
      where: { id: this.conversationId },
      data: { lastMessageAt: customerMsg.createdAt },
    });

    // Broadcast customer message to all sockets
    const customerOutgoing: OutgoingMessage = {
      type: "message",
      id: customerMsg.id,
      content: customerMsg.content,
      senderType: customerMsg.senderType,
      senderId: customerMsg.senderId,
      createdAt: customerMsg.createdAt.toISOString(),
    };
    const customerPayload = JSON.stringify(customerOutgoing);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(customerPayload);
    }

    // Generate AI response (reuses full budget/cache/AI/persist/broadcast flow)
    await this.handleAiResponse(query.content, "customer-chat");
  }

  /** Handle quick-action chip: call tool directly, format, persist, broadcast */
  private async handleQuickAction(
    ws: WebSocket,
    action: AiActionMessage,
  ): Promise<void> {
    if (!this.conversationId) return;

    const handler = ALLOWED_QUICK_TOOLS[action.tool];
    if (!handler) {
      ws.send(JSON.stringify({ type: "error", message: "Unknown tool" }));
      return;
    }

    // Verify conversation & get orgId
    const conversation = await db.conversation.findUnique({
      where: { id: this.conversationId },
      include: { organization: true },
    });
    if (!conversation) return;

    // Budget check via McpDO
    const mcpId = this.env.MCP_DURABLE_OBJECT.idFromName(conversation.organizationId);
    const mcpStub = this.env.MCP_DURABLE_OBJECT.get(mcpId);
    const budget = await mcpStub.checkBudget();
    if (!budget.allowed) {
      const vendorName = conversation.organization.name;
      const msg = `I can't help right now, please message ${vendorName} directly.`;
      const aiMessage = await db.message.create({
        data: {
          conversationId: this.conversationId,
          content: msg,
          senderType: "ai",
          senderId: null,
        },
      });
      await db.conversation.update({
        where: { id: this.conversationId },
        data: { lastMessageAt: aiMessage.createdAt },
      });
      const payload = JSON.stringify({
        type: "message",
        id: aiMessage.id,
        content: aiMessage.content,
        senderType: aiMessage.senderType,
        senderId: aiMessage.senderId,
        createdAt: aiMessage.createdAt.toISOString(),
      } satisfies OutgoingMessage);
      for (const socket of this.ctx.getWebSockets()) {
        socket.send(payload);
      }
      return;
    }

    // Execute tool handler directly (no LLM)
    const result = await handler(action.args, conversation.organizationId);
    const resultText = result.content[0]?.text ?? "{}";
    const formatted = result.isError
      ? "Sorry, something went wrong. Please try again."
      : formatToolResult(action.tool, resultText);

    // Persist AI message
    const aiMessage = await db.message.create({
      data: {
        conversationId: this.conversationId,
        content: formatted,
        senderType: "ai",
        senderId: null,
      },
    });
    await db.conversation.update({
      where: { id: this.conversationId },
      data: { lastMessageAt: aiMessage.createdAt },
    });

    // Broadcast to all sockets
    const outgoing: OutgoingMessage = {
      type: "message",
      id: aiMessage.id,
      content: aiMessage.content,
      senderType: aiMessage.senderType,
      senderId: aiMessage.senderId,
      createdAt: aiMessage.createdAt.toISOString(),
    };
    const payload = JSON.stringify(outgoing);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(payload);
    }
  }

  /** Generate and broadcast an AI response */
  private async handleAiResponse(
    customerMessage: string,
    guardrail?: string,
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

    const conversationHistory: ChatMessage[] = recentMessages
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
      customerMessage,
      conversationHistory,
      orgContext: {
        organizationId: conversation.organizationId,
        orgName: conversation.organization.name,
        customerName: conversation.customerName,
        customerEmail: conversation.customerEmail,
      },
      guardrail,
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

  /** DO alarm handler — send batched email notification */
  async alarm(): Promise<void> {
    await setupDb(this.env);
    const pending = await this.ctx.storage.get<string[]>("pendingEmailMessages");
    if (!pending || pending.length === 0) return;

    // If customer came back online, skip sending
    if (this.ctx.getWebSockets("customer").length > 0) {
      await this.ctx.storage.delete("pendingEmailMessages");
      return;
    }

    if (!this.conversationId) {
      this.conversationId = this.ctx.id.toString();
    }

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
          messagePreview: pending[pending.length - 1],
          messageCount: pending.length,
          chatPath: `/v/${conversation.organization.slug}?chat=${conversation.id}`,
          businessName: conversation.organization.name,
        });
      } catch (err) {
        console.error("[ChatDO] Failed to send batched notification email:", err);
      }
    }

    await this.ctx.storage.delete("pendingEmailMessages");
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    const tags = this.ctx.getTags(ws);

    // RFC 6455: 1005/1006 are reserved and must not be sent in close frames
    const safeCode = code === 1005 || code === 1006 ? 1000 : code;
    try {
      ws.close(safeCode, reason);
    } catch {
      // Socket already closed
    }

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
