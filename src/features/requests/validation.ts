import { z } from "zod";

export const FIELD_LIMITS = {
  species: 200,
  quantity: 100,
  notes: 1000,
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

const fishRequestSchema = z.object({
  requestType: z.literal("fish"),
  species: requiredText("species", "Species"),
  quantity: optionalText("quantity"),
  notes: optionalText("notes"),
  ...sharedFields,
});

/** Question requests don't carry species/quantity (defaulted to null in `parseRequestForm`) — the "details" field becomes the question itself. */
const questionRequestSchema = z.object({
  requestType: z.literal("question"),
  notes: requiredText("notes", "Question"),
  ...sharedFields,
});

export const requestFormSchema = z.discriminatedUnion("requestType", [fishRequestSchema, questionRequestSchema]);

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

/** Parses a raw `c.req.parseBody()` submission into a `FishRequest` create, or field-keyed errors. */
export function parseRequestForm(raw: Record<string, unknown>): RequestFormResult {
  // The customer form's species <select> posts OTHER_SPECIES plus a free-text `speciesOther`.
  const input =
    raw.species === OTHER_SPECIES ? { ...raw, species: typeof raw.speciesOther === "string" ? raw.speciesOther : "" } : raw;
  const result = requestFormSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: flattenErrors(result.error) };
  }

  const parsed = result.data;
  if (!parsed.contactEmail && !parsed.contactPhone) {
    return { success: false, errors: { contactEmail: "Add an email or phone so we can reach you" } };
  }
  if (parsed.requestType === "question") {
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

  return {
    success: true,
    data: {
      requestType: "fish",
      // Single-item form for now; the multi-row builder (#103) adds items[i].*
      // parsing. "Other" free-text is the one custom signal the form has today.
      items: [
        {
          species: parsed.species,
          quantity: parsed.quantity,
          notes: null,
          isCustom: raw.species === OTHER_SPECIES,
        },
      ],
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
