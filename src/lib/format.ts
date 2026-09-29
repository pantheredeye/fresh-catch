/**
 * Plain-language formatting helpers — spelled-out times, week labels,
 * prices, and tel/maps hrefs — plus the timezone math they and
 * `src/features/markets/status.ts` share. Workers run UTC; callers pass
 * `Vendor.timezone` (e.g. "America/Chicago") explicitly.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type LocalParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

function formatToPartsMap(date: Date, tz: string, withSeconds: boolean): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) parts[part.type] = part.value;
  return parts;
}

/** The wall-clock date/time `date` falls on in `tz`. `weekday` is 0=Sunday. */
export function localParts(date: Date, tz: string): LocalParts {
  const p = formatToPartsMap(date, tz, false);
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  // Weekday depends only on the calendar date, so reinterpreting the local
  // Y-M-D as UTC gives the correct index without a second Intl call.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday, hour: Number(p.hour), minute: Number(p.minute) };
}

function tzOffsetMinutes(instant: Date, tz: string): number {
  const p = formatToPartsMap(instant, tz, true);
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * Converts a wall-clock date/time in `tz` to the UTC instant it represents.
 * Two-pass DST correction: the first guess (treating the wall time as UTC)
 * can land on the wrong side of a DST transition, so we re-derive the offset
 * from the corrected guess and adjust once more.
 */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const corrected = new Date(guess.getTime() - tzOffsetMinutes(guess, tz) * 60_000);
  return new Date(guess.getTime() - tzOffsetMinutes(corrected, tz) * 60_000);
}

/** "10am", "8:30am", "12pm" — spelled out, never "10-6". `minutesOfDay` is minutes after local midnight. */
export function formatClockTime(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const minute = minutesOfDay % 60;
  const period = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return minute === 0 ? `${h12}${period}` : `${h12}:${String(minute).padStart(2, "0")}${period}`;
}

/** "10am to 6pm" */
export function formatHoursRange(openMinutes: number, closeMinutes: number): string {
  return `${formatClockTime(openMinutes)} to ${formatClockTime(closeMinutes)}`;
}

/** "within the hour" / "in 1 hour" / "in 7 hours" */
export function formatRelativeHours(minutes: number): string {
  if (minutes < 60) return "within the hour";
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
}

/** "Week of September 8" — the Sunday starting the week `date` falls in, local to `tz`. */
export function formatWeekOf(date: Date, tz: string): string {
  const { year, month, day, weekday } = localParts(date, tz);
  const sunday = new Date(Date.UTC(year, month - 1, day));
  sunday.setUTCDate(sunday.getUTCDate() - weekday);
  return `Week of ${MONTH_NAMES[sunday.getUTCMonth()]} ${sunday.getUTCDate()}`;
}

/** "$14" / "$14.50" */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "tel:+15055550142" from any US phone formatting. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `1${digits}` : digits;
  return `tel:+${withCountryCode}`;
}

/** Google Maps search link for a free-text address. */
export function mapsHref(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
