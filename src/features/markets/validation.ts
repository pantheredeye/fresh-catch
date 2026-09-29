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
  address: 300,
  landmark: 200,
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

/** Raw hour/minute select values — "" means unset, combined post-parse by `parseHours`. */
function hourMinuteField() {
  return z
    .string()
    .optional()
    .transform((v) => v ?? "");
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
  address: optionalText("address"),
  landmark: optionalText("landmark"),
  dayOfWeek: hourMinuteField(),
  openHour: hourMinuteField(),
  openMinute: hourMinuteField(),
  closeHour: hourMinuteField(),
  closeMinute: hourMinuteField(),
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
  address: string | null;
  landmark: string | null;
  dayOfWeek: number | null;
  openMinutes: number | null;
  closeMinutes: number | null;
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

export type HoursFields = { dayOfWeek: string; openHour: string; openMinute: string; closeHour: string; closeMinute: string };
type HoursResult =
  | { success: true; data: { dayOfWeek: number | null; openMinutes: number | null; closeMinutes: number | null } }
  | { success: false; error: string };

/** All-or-none (issue #71): a market either has no structured hours (`schedule` stays the fallback), or all five fields are set. */
function parseHours(raw: HoursFields): HoursResult {
  const values = [raw.dayOfWeek, raw.openHour, raw.openMinute, raw.closeHour, raw.closeMinute];
  if (values.every((v) => v === "")) {
    return { success: true, data: { dayOfWeek: null, openMinutes: null, closeMinutes: null } };
  }
  if (values.some((v) => v === "")) {
    return { success: false, error: "Enter day, open, and close time together, or leave all blank" };
  }

  const dayOfWeek = Number(raw.dayOfWeek);
  const openMinutes = Number(raw.openHour) * 60 + Number(raw.openMinute);
  const closeMinutes = Number(raw.closeHour) * 60 + Number(raw.closeMinute);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: "Enter a valid day" };
  }
  if (closeMinutes <= openMinutes) {
    return { success: false, error: "Close time must be after open time" };
  }
  return { success: true, data: { dayOfWeek, openMinutes, closeMinutes } };
}

/** Inverse of `parseHours`, for prefilling the edit form. */
export function splitHours(market: { dayOfWeek: number | null; openMinutes: number | null; closeMinutes: number | null }): HoursFields {
  if (market.dayOfWeek === null || market.openMinutes === null || market.closeMinutes === null) {
    return { dayOfWeek: "", openHour: "", openMinute: "", closeHour: "", closeMinute: "" };
  }
  return {
    dayOfWeek: String(market.dayOfWeek),
    openHour: String(Math.floor(market.openMinutes / 60)),
    openMinute: String(market.openMinutes % 60),
    closeHour: String(Math.floor(market.closeMinutes / 60)),
    closeMinute: String(market.closeMinutes % 60),
  };
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

  const hours = parseHours(parsed);
  if (!hours.success) {
    return { success: false, errors: { dayOfWeek: hours.error } };
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
      address: parsed.address,
      landmark: parsed.landmark,
      expiresAt,
      ...hours.data,
    },
  };
}
