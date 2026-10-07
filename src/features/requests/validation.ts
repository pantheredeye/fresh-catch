import { z } from "zod";

export const FIELD_LIMITS = {
  species: 200,
  quantity: 100,
  notes: 1000,
  itemNotes: 300,
  contactName: 200,
  contactEmail: 254,
  contactPhone: 40,
  messageBody: 2000,
} as const;

/** Sentinel `species` value for the "Other" option of the customer form's species select. */
export const OTHER_SPECIES = "__other";

/** Locked decision (epic #101): a request holds at most 8 fish. */
export const MAX_REQUEST_ITEMS = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(field: keyof typeof FIELD_LIMITS, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(FIELD_LIMITS[field], `${label} must be ${FIELD_LIMITS[field]} characters or less`);
}

function optionalText(field: keyof typeof FIELD_LIMITS) {
  return z
    .string()
    .max(FIELD_LIMITS[field], `Must be ${FIELD_LIMITS[field]} characters or less`)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null));
}

/** Format-checked only when present; `parseRequestForm` requires at least one of email/phone. */
const optionalEmail = z
  .string()
  .max(FIELD_LIMITS.contactEmail)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || EMAIL_RE.test(v), "Enter a valid email");

const sharedFields = {
  contactName: requiredText("contactName", "Name"),
  contactEmail: optionalEmail,
  contactPhone: optionalText("contactPhone"),
};

/** Fish items live in `items[i].*` fields (parsed by hand below); zod only covers the shared order-level fields. */
const fishRequestSchema = z.object({
  requestType: z.literal("fish"),
  notes: optionalText("notes"),
  ...sharedFields,
});

/** Question requests don't carry species/quantity (defaulted to null in `parseRequestForm`) — the "details" field becomes the question itself. */
const questionRequestSchema = z.object({
  requestType: z.literal("question"),
  notes: requiredText("notes", "Question"),
  ...sharedFields,
});

/**
 * One line of an order request (#102). `priceCents`/`status`/`vendorNote` are
 * vendor-side and never come from the customer form, so they're absent here.
 */
export type RequestItemInput = {
  species: string;
  quantity: string | null;
  notes: string | null;
  isCustom: boolean; // not on the live catch list at submit — "Evan will confirm"
};

export type RequestInput = {
  requestType: "fish" | "question";
  /** 1..MAX_REQUEST_ITEMS for fish; empty for question. Item 0 is the headline. */
  items: RequestItemInput[];
  notes: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type RequestFormResult =
  | { success: true; data: RequestInput }
  | { success: false; errors: Record<string, string> };

function flattenErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  return errors;
}

/** Error keys double as field element ids, so `ErrorSummary` anchors land on the right row's input. */
export function itemFieldId(index: number, field: "species" | "speciesOther" | "quantity" | "notes"): string {
  return `items-${index}-${field}`;
}

type RawItemRow = { species: string; speciesOther: string; quantity: string; notes: string };

const ITEM_KEY_RE = /^items\[(\d+)\]\.(species|speciesOther|quantity|notes)$/;

/** Groups a `parseBody()`'s flat `items[i].field` keys into index-ordered rows. The form always renders contiguous indexes, so row order == array order. */
export function rawItemRows(raw: Record<string, unknown>): Array<{ index: number; row: RawItemRow }> {
  const byIndex = new Map<number, RawItemRow>();
  for (const [key, value] of Object.entries(raw)) {
    const match = key.match(ITEM_KEY_RE);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const row = byIndex.get(index) ?? { species: "", speciesOther: "", quantity: "", notes: "" };
    row[match[2] as keyof RawItemRow] = value;
    byIndex.set(index, row);
  }
  return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([index, row]) => ({ index, row }));
}

/**
 * `liveSpecies` = this week's requestable list: a typed/selected species not
 * on it is `isCustom` even without the "Other" sentinel (it can sell out
 * between page load and submit). With no live list at all, nothing is flagged
 * — there's no list to be "not on".
 */
function parseItems(raw: Record<string, unknown>, liveSpecies: string[] | undefined) {
  const errors: Record<string, string> = {};
  const items: RequestItemInput[] = [];
  for (const { index, row } of rawItemRows(raw)) {
    const isOther = row.species === OTHER_SPECIES;
    const species = (isOther ? row.speciesOther : row.species).trim();
    const quantity = row.quantity.trim();
    const notes = row.notes.trim();
    // A fully blank row is an abandoned "Add another fish" tap — dropped silently.
    if (!species && !quantity && !notes) continue;
    const speciesField = itemFieldId(index, isOther ? "speciesOther" : "species");
    if (!species) {
      errors[speciesField] = isOther ? "Enter the fish name" : "Species is required";
      continue;
    }
    if (species.length > FIELD_LIMITS.species) {
      errors[speciesField] = `Species must be ${FIELD_LIMITS.species} characters or less`;
    }
    if (quantity.length > FIELD_LIMITS.quantity) {
      errors[itemFieldId(index, "quantity")] = `Must be ${FIELD_LIMITS.quantity} characters or less`;
    }
    if (notes.length > FIELD_LIMITS.itemNotes) {
      errors[itemFieldId(index, "notes")] = `Must be ${FIELD_LIMITS.itemNotes} characters or less`;
    }
    // On-list wins even via the "Other" sentinel — typing a live species under
    // "Other" is still this week's fish, not a custom request.
    const onList = !!liveSpecies?.some((live) => live.toLowerCase() === species.toLowerCase());
    const isCustom = (isOther || !!liveSpecies?.length) && !onList;
    items.push({ species, quantity: quantity || null, notes: notes || null, isCustom });
  }
  if (items.length === 0 && Object.keys(errors).length === 0) {
    errors[itemFieldId(0, "species")] = "Add at least one fish";
  }
  if (items.length > MAX_REQUEST_ITEMS) {
    // ??= so a real row-0 error isn't clobbered by the count error.
    errors[itemFieldId(0, "species")] ??= `Up to ${MAX_REQUEST_ITEMS} fish per request`;
  }
  return { items, errors };
}

/** Parses a raw `c.req.parseBody()` submission into a `FishRequest` create, or field-id-keyed errors. */
export function parseRequestForm(
  raw: Record<string, unknown>,
  options: { liveSpecies?: string[] } = {},
): RequestFormResult {
  if (raw.requestType !== "fish" && raw.requestType !== "question") {
    return { success: false, errors: { requestType: "Choose a request type" } };
  }

  if (raw.requestType === "question") {
    const result = questionRequestSchema.safeParse(raw);
    if (!result.success) return { success: false, errors: flattenErrors(result.error) };
    const parsed = result.data;
    if (!parsed.contactEmail && !parsed.contactPhone) {
      return { success: false, errors: { contactEmail: "Add an email or phone so we can reach you" } };
    }
    return {
      success: true,
      data: {
        requestType: "question",
        items: [],
        notes: parsed.notes,
        contactName: parsed.contactName,
        contactEmail: parsed.contactEmail,
        contactPhone: parsed.contactPhone,
      },
    };
  }

  // Fish: collect shared-field and per-row errors together so one 400 shows everything.
  const shared = fishRequestSchema.safeParse(raw);
  const { items, errors: itemErrors } = parseItems(raw, options.liveSpecies);
  const errors = { ...(shared.success ? {} : flattenErrors(shared.error)), ...itemErrors };
  if (Object.keys(errors).length > 0 || !shared.success) {
    return { success: false, errors };
  }

  const parsed = shared.data;
  if (!parsed.contactEmail && !parsed.contactPhone) {
    return { success: false, errors: { contactEmail: "Add an email or phone so we can reach you" } };
  }
  return {
    success: true,
    data: {
      requestType: "fish",
      items,
      notes: parsed.notes,
      contactName: parsed.contactName,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
    },
  };
}

export const messageFormSchema = z.object({
  body: requiredText("messageBody", "Message"),
});

export type MessageFormResult = { success: true; data: { body: string } } | { success: false; errors: Record<string, string> };

export function parseMessageForm(raw: Record<string, unknown>): MessageFormResult {
  const result = messageFormSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, errors: flattenErrors(result.error) };
  }
  return { success: true, data: result.data };
}

/** R7: the vocabulary stops here — payment state lives on the (later) linked Order, never a fifth status. */
export const REQUEST_STATUSES = ["open", "confirmed", "fulfilled", "declined"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const statusUpdateSchema = z.object({ status: z.enum(REQUEST_STATUSES) });

export function parseStatusUpdate(raw: Record<string, unknown>): { success: true; data: { status: RequestStatus } } | { success: false } {
  const result = statusUpdateSchema.safeParse(raw);
  if (!result.success) return { success: false };
  return { success: true, data: result.data };
}
