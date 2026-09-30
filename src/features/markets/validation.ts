import { z } from "zod";
import { localParts, zonedTimeToUtc } from "@/lib/format";

/** Ported verbatim from v1 (`git show main:src/app/pages/admin/market-functions.ts`). */
export const FIELD_LIMITS = {
  name: 200,
  schedule: 500,
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

/** Raw select values — "" means unset, parsed post-schema by `parseHours` / `parseExpiry`. */
function rawSelect() {
  return z
    .string()
    .optional()
    .transform((v) => v ?? "");
}

const sharedFields = {
  name: requiredText("name", "Name"),
  schedule: requiredText("schedule", "Schedule"),
  customerInfo: optionalText("customerInfo"),
  catchPreview: optionalText("catchPreview"),
  notes: optionalText("notes"),
  county: optionalText("county"),
  city: optionalText("city"),
  address: optionalText("address"),
  landmark: optionalText("landmark"),
  dayOfWeek: rawSelect(),
  openTime: rawSelect(),
  closeTime: rawSelect(),
  expiresDate: rawSelect(),
  expiresTime: rawSelect(),
};

export const marketFormSchema = z.object({ type: z.enum(["regular", "popup"]), ...sharedFields });

/** `subtitle` / `locationDetails` are retired from the form — always written null; legacy text is folded into `customerInfo` / `notes` on edit prefill. */
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

export type ParseOptions = {
  /** Vendor timezone (IANA) — expiry is entered as local wall-clock time. */
  tz: string;
  now: Date;
  /** Edit only: an unchanged (even past) expiry stays valid so notes on an ended popup can still be edited. */
  existingExpiresAt?: Date | null;
};

/** Minutes-of-day select value ("" → null, invalid → NaN). */
function parseMinutes(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < 24 * 60 ? n : Number.NaN;
}

export type HoursFields = { dayOfWeek: string; openTime: string; closeTime: string };
type HoursResult =
  | { success: true; data: { dayOfWeek: number | null; openMinutes: number | null; closeMinutes: number | null } }
  | { success: false; field: keyof HoursFields; error: string };

/** All-or-none (issue #71): no structured hours (`schedule` stays the fallback), or day + open + close all set. Error is keyed to the first blank field. */
function parseHours(raw: HoursFields): HoursResult {
  const entries: [keyof HoursFields, string][] = [
    ["dayOfWeek", raw.dayOfWeek],
    ["openTime", raw.openTime],
    ["closeTime", raw.closeTime],
  ];
  if (entries.every(([, v]) => v === "")) {
    return { success: true, data: { dayOfWeek: null, openMinutes: null, closeMinutes: null } };
  }
  const blank = entries.find(([, v]) => v === "");
  if (blank) {
    const label = { dayOfWeek: "a day", openTime: "an opening time", closeTime: "a closing time" }[blank[0]];
    return { success: false, field: blank[0], error: `Choose ${label}, or leave day, opens, and closes all blank` };
  }

  const dayOfWeek = Number(raw.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, field: "dayOfWeek", error: "Choose a valid day" };
  }
  const openMinutes = parseMinutes(raw.openTime);
  const closeMinutes = parseMinutes(raw.closeTime);
  if (openMinutes === null || Number.isNaN(openMinutes)) {
    return { success: false, field: "openTime", error: "Choose a valid opening time" };
  }
  if (closeMinutes === null || Number.isNaN(closeMinutes)) {
    return { success: false, field: "closeTime", error: "Choose a valid closing time" };
  }
  if (closeMinutes <= openMinutes) {
    return { success: false, field: "closeTime", error: "Close time must be after open time" };
  }
  return { success: true, data: { dayOfWeek, openMinutes, closeMinutes } };
}

/** Inverse of `parseHours`, for prefilling the edit form. */
export function splitHours(market: { dayOfWeek: number | null; openMinutes: number | null; closeMinutes: number | null }): HoursFields {
  if (market.dayOfWeek === null || market.openMinutes === null || market.closeMinutes === null) {
    return { dayOfWeek: "", openTime: "", closeTime: "" };
  }
  return {
    dayOfWeek: String(market.dayOfWeek),
    openTime: String(market.openMinutes),
    closeTime: String(market.closeMinutes),
  };
}

/** Default popup end: today 6:00 pm in the vendor's timezone. If that has already passed, the save is rejected with a visible error — no silent shift. */
const DEFAULT_EXPIRES_MINUTES = 18 * 60;

/** Local date/time for the form. `null` expiry (new popup) → today 6:00 pm local. */
export function splitExpiresAt(expiresAt: Date | null, tz: string, now: Date): { expiresDate: string; expiresTime: string } {
  const p = localParts(expiresAt ?? now, tz);
  const expiresDate = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  if (!expiresAt) return { expiresDate, expiresTime: String(DEFAULT_EXPIRES_MINUTES) };
  return { expiresDate, expiresTime: String(p.hour * 60 + p.minute) };
}

function parseExpiry(
  raw: { expiresDate: string; expiresTime: string },
  { tz, now, existingExpiresAt }: ParseOptions,
): { success: true; data: Date } | { success: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const m = DATE_RE.test(raw.expiresDate) ? raw.expiresDate.split("-").map(Number) : null;
  if (!m) errors.expiresDate = raw.expiresDate === "" ? "Choose the day it ends" : "Enter a valid end date";
  const minutes = parseMinutes(raw.expiresTime);
  if (minutes === null) errors.expiresTime = "Choose the time it ends";
  else if (Number.isNaN(minutes)) errors.expiresTime = "Choose a valid end time";
  if (!m || minutes === null || Number.isNaN(minutes)) return { success: false, errors };

  const [year, month, day] = m;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return { success: false, errors: { expiresDate: "Enter a valid end date" } };
  }
  const expiresAt = zonedTimeToUtc(year, month, day, Math.floor(minutes / 60), minutes % 60, tz);
  const unchanged = existingExpiresAt && existingExpiresAt.getTime() === expiresAt.getTime();
  if (expiresAt.getTime() <= now.getTime() && !unchanged) {
    return { success: false, errors: { expiresTime: "End time has passed — pick a later day or time" } };
  }
  return { success: true, data: expiresAt };
}

/** Parses a raw `c.req.parseBody()` submission into a `Market` write, or field-keyed errors. */
export function parseMarketForm(raw: Record<string, unknown>, options: ParseOptions): MarketFormResult {
  const result = marketFormSchema.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) errors[field] = messages[0];
    }
    return { success: false, errors };
  }

  const parsed = result.data;
  let expiresAt: Date | null = null;
  let hoursData: { dayOfWeek: number | null; openMinutes: number | null; closeMinutes: number | null } = {
    dayOfWeek: null,
    openMinutes: null,
    closeMinutes: null,
  };

  if (parsed.type === "popup") {
    // Popups have no weekly hours — they end at a specific moment.
    const expiry = parseExpiry(parsed, options);
    if (expiry.success) expiresAt = expiry.data;
    else Object.assign(errors, expiry.errors);
  } else {
    const hours = parseHours(parsed);
    if (hours.success) hoursData = hours.data;
    else errors[hours.field] = hours.error;
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      type: parsed.type,
      name: parsed.name,
      schedule: parsed.schedule,
      subtitle: null,
      locationDetails: null,
      customerInfo: parsed.customerInfo,
      catchPreview: parsed.catchPreview,
      notes: parsed.notes,
      county: parsed.county,
      city: parsed.city,
      address: parsed.address,
      landmark: parsed.landmark,
      expiresAt,
      ...hoursData,
    },
  };
}
