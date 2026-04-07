/**
 * MCP tool handler implementations.
 * Each handler takes validated input + organizationId + optional callerRole,
 * queries D1, returns structured data.
 * Errors are returned as { isError: true, content: [...] }, never thrown.
 */

import { env } from "cloudflare:workers";
import { db } from "@/db";
import {
  ListCatchInputSchema,
  GetMarketsInputSchema,
  GetVendorPopupsInputSchema,
  GetMarketVendorsInputSchema,
  CreateOrderInputSchema,
  UpdateCatchInputSchema,
  CreateMarketInputSchema,
  CreatePopupInputSchema,
  UpdateMarketInputSchema,
  UpdateMarketCatchInputSchema,
  SendMessageInputSchema,
  type ListCatchInput,
  type GetMarketsInput,
} from "./voice-tools";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function textResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

function errorResult(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function checkRole(callerRole: string | undefined, allowedRoles: string[]): ToolResult | null {
  if (!callerRole || !allowedRoles.includes(callerRole)) {
    return errorResult(`Forbidden: requires role ${allowedRoles.join(" or ")}, got ${callerRole ?? "none"}`);
  }
  return null;
}

function invalidateResponseCache(organizationId: string): void {
  try {
    const doId = env.MCP_DURABLE_OBJECT.idFromName(organizationId);
    const stub = env.MCP_DURABLE_OBJECT.get(doId);
    stub.invalidateResponseCache();
  } catch { /* cache invalidation must not crash the handler */ }
}

export async function handleListCatch(
  rawInput: unknown,
  organizationId: string,
): Promise<ToolResult> {
  const parsed = ListCatchInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input: ListCatchInput = parsed.data;

  try {
    const catchUpdate = await db.catchUpdate.findFirst({
      where: { organizationId, status: "live" },
      orderBy: { createdAt: "desc" },
    });

    if (!catchUpdate) {
      return textResult({
        items: [],
        message: "No catch currently available.",
      });
    }

    const content = JSON.parse(catchUpdate.formattedContent) as {
      headline?: string;
      items?: Array<{ name: string; note: string }>;
      summary?: string;
    };

    let items = content.items ?? [];

    if (input.itemName) {
      const filter = input.itemName.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(filter));
    }

    return textResult({
      headline: content.headline ?? null,
      items,
      summary: content.summary ?? null,
      updatedAt: catchUpdate.createdAt.toISOString(),
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleGetMarkets(
  rawInput: unknown,
  organizationId: string,
): Promise<ToolResult> {
  const parsed = GetMarketsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input: GetMarketsInput = parsed.data;

  try {
    const where: Record<string, unknown> = { organizationId };
    if (input.activeOnly) where.active = true;
    if (input.type) where.type = input.type;

    const markets = await db.market.findMany({
      where,
      orderBy: [{ county: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return textResult({
      markets: markets.map((m) => ({
        id: m.id,
        name: m.name,
        schedule: m.schedule,
        type: m.type,
        active: m.active,
        locationDetails: m.locationDetails,
        customerInfo: m.customerInfo,
        county: m.county,
        city: m.city,
      })),
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleGetVendorPopups(
  rawInput: unknown,
  organizationId: string,
): Promise<ToolResult> {
  const parsed = GetVendorPopupsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }

  try {
    const now = new Date();
    const popups = await db.market.findMany({
      where: {
        organizationId,
        type: "popup",
        expiresAt: { gt: now },
        cancelledAt: null,
      },
      orderBy: { expiresAt: "asc" },
    });

    return textResult({
      popups: popups.map((m) => ({
        id: m.id,
        name: m.name,
        schedule: m.schedule,
        expiresAt: m.expiresAt?.toISOString() ?? null,
        locationDetails: m.locationDetails,
        county: m.county,
        city: m.city,
      })),
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleGetMarketVendors(
  rawInput: unknown,
  _organizationId: string,
): Promise<ToolResult> {
  const parsed = GetMarketVendorsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const { marketId } = parsed.data;

  try {
    // Look up the target market (cross-org read)
    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!market) {
      return errorResult(`Market not found: ${marketId}`);
    }

    // Find all markets with the same name to identify co-vendors
    const coMarkets = await db.market.findMany({
      where: {
        name: market.name,
        active: true,
      },
      include: {
        organization: { select: { name: true, slug: true } },
      },
    });

    // Deduplicate by org slug, expose only public data
    const seen = new Set<string>();
    const vendors: Array<{ name: string; slug: string }> = [];
    for (const m of coMarkets) {
      if (!seen.has(m.organization.slug)) {
        seen.add(m.organization.slug);
        vendors.push({
          name: m.organization.name,
          slug: m.organization.slug,
        });
      }
    }

    return textResult({
      marketName: market.name,
      vendors,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// --- Write tool handlers ---

export async function handleCreateOrder(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["customer"]);
  if (roleErr) return roleErr;

  const parsed = CreateOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  if (input.items.length === 0) {
    return errorResult("Items array must not be empty");
  }

  try {
    // Validate pickup market belongs to org
    const market = await db.market.findFirst({
      where: { id: input.pickupMarketId, organizationId },
    });
    if (!market) {
      return errorResult(`Market not found or does not belong to this organization: ${input.pickupMarketId}`);
    }

    // Get next order number with retry for unique constraint
    let orderNumber = 1;
    const lastOrder = await db.order.findFirst({
      where: { organizationId },
      orderBy: { orderNumber: "desc" },
    });
    if (lastOrder) {
      orderNumber = lastOrder.orderNumber + 1;
    }

    const order = await db.order.create({
      data: {
        userId: "mcp-api",
        organizationId,
        orderNumber,
        contactName: input.contactName || "MCP Order",
        contactEmail: input.contactEmail || null,
        items: JSON.stringify(input.items),
        preferredDate: new Date(input.pickupDate),
        notes: input.customerNote,
        status: "pending",
      },
    });

    return textResult({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "pending",
      itemCount: input.items.length,
    });
  } catch (err) {
    // Retry once on unique constraint violation (race condition on orderNumber)
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      try {
        const lastOrder = await db.order.findFirst({
          where: { organizationId },
          orderBy: { orderNumber: "desc" },
        });
        const retryNumber = (lastOrder?.orderNumber ?? 0) + 1;

        const order = await db.order.create({
          data: {
            userId: "mcp-api",
            organizationId,
            orderNumber: retryNumber,
            contactName: input.contactName || "MCP Order",
            contactEmail: input.contactEmail || null,
            items: JSON.stringify(input.items),
            preferredDate: new Date(input.pickupDate),
            notes: input.customerNote,
            status: "pending",
          },
        });

        return textResult({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "pending",
          itemCount: input.items.length,
        });
      } catch (retryErr) {
        return errorResult(
          `Database error: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
        );
      }
    }
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleUpdateCatch(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager"]);
  if (roleErr) return roleErr;

  const parsed = UpdateCatchInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    // Archive existing live catch
    await db.catchUpdate.updateMany({
      where: { organizationId, status: "live" },
      data: { status: "archived" },
    });

    // Create new live catch
    await db.catchUpdate.create({
      data: {
        organizationId,
        recordedBy: "mcp-api",
        rawTranscript: "MCP tool call",
        formattedContent: JSON.stringify({
          headline: input.headline,
          items: input.items,
          summary: input.summary,
        }),
        status: "live",
      },
    });

    invalidateResponseCache(organizationId);

    return textResult({
      published: true,
      headline: input.headline,
      itemCount: input.items.length,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleUpdateMarketCatch(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager"]);
  if (roleErr) return roleErr;

  const parsed = UpdateMarketCatchInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    // Verify market exists and belongs to org
    const market = await db.market.findFirst({
      where: { id: input.marketId, organizationId },
    });
    if (!market) {
      return errorResult(`Market not found or does not belong to this organization: ${input.marketId}`);
    }

    // Update market catch preview
    await db.market.update({
      where: { id: input.marketId },
      data: { catchPreview: JSON.stringify({ items: input.catchPreview }) },
    });

    invalidateResponseCache(organizationId);

    return textResult({
      updated: true,
      marketId: input.marketId,
      itemCount: input.catchPreview.length,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleCreateMarket(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager"]);
  if (roleErr) return roleErr;

  const parsed = CreateMarketInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    const market = await db.market.create({
      data: {
        organizationId,
        name: input.name,
        schedule: input.schedule,
        locationDetails: input.locationDetails || null,
        customerInfo: input.customerInfo || null,
        active: input.active ?? true,
        type: "regular",
        catchPreview: input.catchPreview || null,
      },
    });

    invalidateResponseCache(organizationId);

    return textResult({
      created: true,
      marketId: market.id,
      name: market.name,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleCreatePopup(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager"]);
  if (roleErr) return roleErr;

  const parsed = CreatePopupInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    const market = await db.market.create({
      data: {
        organizationId,
        name: input.name,
        schedule: input.schedule,
        type: "popup",
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        locationDetails: input.locationDetails || null,
        customerInfo: input.customerInfo || null,
        active: input.active ?? true,
        catchPreview: input.catchPreview || null,
        notes: input.notes || null,
      },
    });

    invalidateResponseCache(organizationId);

    return textResult({
      created: true,
      marketId: market.id,
      name: market.name,
      type: "popup",
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleUpdateMarket(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager"]);
  if (roleErr) return roleErr;

  const parsed = UpdateMarketInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    const market = await db.market.findFirst({
      where: { id: input.marketId, organizationId },
    });
    if (!market) {
      return errorResult(`Market not found or does not belong to this organization: ${input.marketId}`);
    }

    const updated = await db.market.update({
      where: { id: input.marketId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.schedule !== undefined && { schedule: input.schedule }),
        ...(input.locationDetails !== undefined && { locationDetails: input.locationDetails || null }),
        ...(input.customerInfo !== undefined && { customerInfo: input.customerInfo || null }),
        ...(input.active !== undefined && { active: input.active }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }),
        ...(input.catchPreview !== undefined && { catchPreview: input.catchPreview || null }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
      },
    });

    invalidateResponseCache(organizationId);

    return textResult({
      updated: true,
      marketId: updated.id,
      name: updated.name,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function handleSendMessage(
  rawInput: unknown,
  organizationId: string,
  callerRole?: string,
): Promise<ToolResult> {
  const roleErr = checkRole(callerRole, ["owner", "manager", "customer"]);
  if (roleErr) return roleErr;

  const parsed = SendMessageInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(`Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  try {
    // Verify conversation exists and belongs to org
    const conversation = await db.conversation.findFirst({
      where: { id: input.conversationId, organizationId },
    });
    if (!conversation) {
      return errorResult(`Conversation not found or does not belong to this organization: ${input.conversationId}`);
    }

    // Create message
    await db.message.create({
      data: {
        conversationId: input.conversationId,
        content: input.text,
        senderType: callerRole === "customer" ? "customer" : "vendor",
        senderId: "mcp-api",
      },
    });

    // Update conversation lastMessageAt
    await db.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return textResult({
      sent: true,
      conversationId: input.conversationId,
    });
  } catch (err) {
    return errorResult(
      `Database error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
