import { z } from "zod";
import type { CatchContent } from "./pipeline";

export const CATCH_FIELD_LIMITS = {
  headline: 200,
  summary: 500,
  itemName: 200,
  itemNote: 500,
  rawTranscript: 5000,
} as const;

const catchItemSchema = z.object({
  name: z.string().trim().min(1).max(CATCH_FIELD_LIMITS.itemName),
  note: z.string().trim().max(CATCH_FIELD_LIMITS.itemNote),
});

const publishFieldsSchema = z.object({
  headline: z.string().trim().min(1, "Headline is required").max(CATCH_FIELD_LIMITS.headline),
  summary: z.string().trim().min(1, "Summary is required").max(CATCH_FIELD_LIMITS.summary),
  itemsJson: z.string().min(1, "No items to publish"),
  rawTranscript: z.string().max(CATCH_FIELD_LIMITS.rawTranscript),
});

export type PublishInput = {
  content: CatchContent;
  rawTranscript: string;
};

export type PublishResult = { success: true; data: PublishInput } | { success: false; error: string };

/** Parses the hidden fields the client island fills in from a record draft (§`GET /admin/catch`). */
export function parsePublishForm(raw: Record<string, unknown>): PublishResult {
  const fields = publishFieldsSchema.safeParse(raw);
  if (!fields.success) {
    return { success: false, error: fields.error.issues[0]?.message ?? "Invalid submission" };
  }

  let itemsRaw: unknown;
  try {
    itemsRaw = JSON.parse(fields.data.itemsJson);
  } catch {
    return { success: false, error: "Could not read catch items" };
  }

  const items = z.array(catchItemSchema).min(1, "At least one item is required").safeParse(itemsRaw);
  if (!items.success) {
    return { success: false, error: items.error.issues[0]?.message ?? "Invalid items" };
  }

  return {
    success: true,
    data: {
      content: { headline: fields.data.headline, items: items.data, summary: fields.data.summary },
      rawTranscript: fields.data.rawTranscript,
    },
  };
}
