import { z } from "zod";

/** Ported verbatim from v1 (`git show main:src/app/pages/admin/market-functions.ts`). */
export const FIELD_LIMITS = {
  name: 200,
  schedule: 500,
  subtitle: 200,
  locationDetails: 500,
  customerInfo: 1000,
  catchPreview: 2000,
  notes: 1000,
  county: 100,
  city: 100,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

const sharedFields = {
  name: requiredText("name", "Name"),
  schedule: requiredText("schedule", "Schedule"),
  subtitle: optionalText("subtitle"),
  locationDetails: optionalText("locationDetails"),
  customerInfo: optionalText("customerInfo"),
  catchPreview: optionalText("catchPreview"),
  notes: optionalText("notes"),
  county: optionalText("county"),
  city: optionalText("city"),
};

const regularMarketSchema = z.object({ type: z.literal("regular"), ...sharedFields });

const popupMarketSchema = z.object({
  type: z.literal("popup"),
  ...sharedFields,
  expiresDate: z.string().regex(DATE_RE, "Enter a valid expiry date"),
  expiresHour: z.coerce.number().int().min(0, "Enter a valid hour").max(23, "Enter a valid hour"),
});

/** C5: popups require an expiry (UTC date + hour, no tz library); regulars reject one. */
export const marketFormSchema = z.discriminatedUnion("type", [regularMarketSchema, popupMarketSchema]);

export type MarketInput = {
  type: "regular" | "popup";
  name: string;
  schedule: string;
  subtitle: string | null;
  locationDetails: string | null;
  customerInfo: string | null;
  catchPreview: string | null;
  notes: string | null;
  county: string | null;
  city: string | null;
  expiresAt: Date | null;
};

export type MarketFormResult =
  | { success: true; data: MarketInput }
  | { success: false; errors: Record<string, string> };

function combineExpiresAt(expiresDate: string, expiresHour: number): Date {
  return new Date(`${expiresDate}T${String(expiresHour).padStart(2, "0")}:00:00Z`);
}

/** Inverse of `combineExpiresAt`, for prefilling the edit form. */
export function splitExpiresAt(expiresAt: Date | null): { expiresDate: string; expiresHour: string } {
  if (!expiresAt) return { expiresDate: "", expiresHour: "23" };
  const iso = expiresAt.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  return { expiresDate: iso.slice(0, 10), expiresHour: String(Number(iso.slice(11, 13))) };
}

/** Parses a raw `c.req.parseBody()` submission into a `Market` write, or field-keyed errors. */
export function parseMarketForm(raw: Record<string, unknown>): MarketFormResult {
  const result = marketFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const errors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) errors[field] = messages[0];
    }
    return { success: false, errors };
  }

  const parsed = result.data;
  const expiresAt = parsed.type === "popup" ? combineExpiresAt(parsed.expiresDate, parsed.expiresHour) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { success: false, errors: { expiresDate: "Enter a valid expiry date" } };
  }

  return {
    success: true,
    data: {
      type: parsed.type,
      name: parsed.name,
      schedule: parsed.schedule,
      subtitle: parsed.subtitle,
      locationDetails: parsed.locationDetails,
      customerInfo: parsed.customerInfo,
      catchPreview: parsed.catchPreview,
      notes: parsed.notes,
      county: parsed.county,
      city: parsed.city,
      expiresAt,
    },
  };
}
