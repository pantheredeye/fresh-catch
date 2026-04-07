/**
 * MCP tool handler implementations for read-only tools.
 * Each handler takes validated input + organizationId, queries D1, returns structured data.
 * Errors are returned as { isError: true, content: [...] }, never thrown.
 */

import { db } from "@/db";
import {
  ListCatchInputSchema,
  GetMarketsInputSchema,
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
