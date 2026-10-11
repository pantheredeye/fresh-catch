import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import type { Market } from "@/lib/db";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { Band } from "@/ui/band";
import { getLiveCatchUpdate } from "@/features/catch/queries";
import { parseCatchContent } from "@/features/catch/pipeline";
import { listActiveMarkets, listLivePopups } from "@/features/markets/queries";
import { getVendor } from "@/features/vendor/queries";
import {
  describeOccurrence,
  isSameLocalDate,
  nextOccurrence,
  resolveToday,
  type StatusMarket,
  type TodayStatus,
} from "@/features/markets/status";
import {
  WEEKDAY_NAMES,
  formatClockTime,
  formatHoursRange,
  formatWeekOf,
  localParts,
  smsHref,
  telHref,
} from "@/lib/format";
import { assetUrl } from "@/lib/assets";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { StatusStrip } from "@/ui/status-strip";
import { ActionBar } from "@/ui/action-bar";
import { ClosingBand, FishBoard, hasPrices, RouteBand, SavedBand, type RouteRow, type SavedPin } from "./components";
import { formatSchedule, hasValidHours, marketAddressLine } from "@/features/markets/display";

export const homeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type StripData = { open: boolean; label: string; message: string; href: string; dot: boolean };

/** Day + hours for the strip's closed copy: "Fri 10–6" (clock minutes → compact range). */
function compactHours(market: Market): string {
  const day = WEEKDAY_NAMES[market.dayOfWeek!].slice(0, 3);
  const clock = (m: number) => formatClockTime(m).replace(/(:00)?(am|pm)$/, "");
  return `${day} ${clock(market.openMinutes!)}–${clock(market.closeMinutes!)}`;
}

/**
 * The status strip doubles as the "next stop" line (replaces the old hero band).
 * Popups win over regulars via `resolveToday`; with no structured hours
 * anywhere, falls back to the first regular market's free-text schedule.
 */
function buildStrip(status: TodayStatus, fallback: Market | null, now: Date, tz: string): StripData | null {
  if ((status.kind === "open" || status.kind === "opens-later") && status.market) {
    const market = status.market as Market;
    const occurrence = nextOccurrence(market, now, tz);
    const href = `/markets/${market.id}`;
    if (status.kind === "open") {
      const until = occurrence ? localParts(occurrence.closesAt, tz) : null;
      return {
        open: true,
        label: "Open now",
        message: until ? `${market.name} until ${formatClockTime(until.hour * 60 + until.minute)}` : market.name,
        href,
        dot: true,
      };
    }
    const opens = occurrence ? localParts(occurrence.opensAt, tz) : null;
    return {
      open: false,
      label: opens ? `Opens ${formatClockTime(opens.hour * 60 + opens.minute)}` : "Opens later today",
      message: market.name,
      href,
      dot: true,
    };
  }
  if (status.next) {
    const market = status.next.market as Market;
    return {
      open: false,
      label: "Closed today",
      message: `Next: ${market.name}, ${hasValidHours(market) ? compactHours(market) : WEEKDAY_NAMES[localParts(status.next.opensAt, tz).weekday]}`,
      href: `/markets/${market.id}`,
      dot: true,
    };
  }
  if (fallback) {
    const schedule = formatSchedule(fallback.schedule);
    return {
      open: false,
      label: "Next stop",
      message: schedule ? `${fallback.name}, ${schedule}` : fallback.name,
      href: `/markets/${fallback.id}`,
      dot: false,
    };
  }
  return null;
}

function buildRouteRows(
  regularMarkets: Market[],
  livePopups: Market[],
  now: Date,
  tz: string,
): RouteRow[] {
  const local = localParts(now, tz);
  const todayWeekday = local.weekday;

  const popupRows: RouteRow[] = livePopups.map((market) => {
    const occurrence = nextOccurrence(market, now, tz);
    return {
      market,
      isPopup: true,
      dayLabel: null,
      hoursLabel: occurrence ? describeOccurrence(occurrence, now, tz) : null,
      addressLabel: marketAddressLine(market),
      isToday: true,
      todayTag: "Here today",
    };
  });

  const regularRows: RouteRow[] = regularMarkets.map((market) => {
    const occurrence = nextOccurrence(market, now, tz);
    const occursToday = occurrence === null || isSameLocalDate(localParts(occurrence.opensAt, tz), local);
    const isToday = market.dayOfWeek === todayWeekday && occursToday;
    return {
      market,
      isPopup: false,
      dayLabel: market.dayOfWeek !== null ? WEEKDAY_NAMES[market.dayOfWeek] : null,
      hoursLabel:
        hasValidHours(market)
          ? formatHoursRange(market.openMinutes, market.closeMinutes)
          : null,
      addressLabel: marketAddressLine(market),
      isToday,
      todayTag: isToday ? (occurrence?.state === "open-now" ? "Here today" : "Here later today") : null,
    };
  });

  return [...popupRows, ...regularRows];
}

function buildSavedPins(markets: Market[], now: Date, tz: string): SavedPin[] {
  const pins: SavedPin[] = [];
  for (const market of markets) {
    const occurrence = nextOccurrence(market, now, tz);
    const description = occurrence ? describeOccurrence(occurrence, now, tz) : market.schedule?.trim();
    if (!description) continue;
    pins.push({ marketId: market.id, name: market.name, description });
  }
  return pins;
}

homeRoutes.get("/", async (c) => {
  const session = c.var.session;
  const now = new Date();
  const [live, regularMarkets, livePopups, vendor] = await Promise.all([
    getLiveCatchUpdate(),
    listActiveMarkets(),
    listLivePopups(),
    getVendor(),
  ]);
  const tz = vendor?.timezone ?? "America/Chicago";
  const catchContent = live ? parseCatchContent(live.formattedContent) : null;
  const weekOf = live ? formatWeekOf(live.createdAt, tz) : null;

  const allMarkets: StatusMarket[] = [...livePopups, ...regularMarkets];
  const status = resolveToday(allMarkets, now, tz);

  const fallbackMarket = status.market || status.next ? null : (regularMarkets[0] ?? null);
  const strip = buildStrip(status, fallbackMarket, now, tz);

  const routeRows = buildRouteRows(regularMarkets, livePopups, now, tz);
  const savedPins = buildSavedPins([...livePopups, ...regularMarkets], now, tz);

  return c.html(
    <Document deviceToken={c.var.deviceToken}>
      <Page bleed>
        <BrandBar vendor={vendor} container />
        {strip ? <StatusStrip {...strip} container /> : null}
        <SavedBand pins={savedPins} />
        <div class="home-split">
          <Band tone="sand" class="home-fish">
            <FishBoard content={catchContent} weekOf={weekOf} vendor={vendor} />
          </Band>
          <Band tone="paper" class="home-route">
            <div class="home-route-inner">
              <RouteBand rows={routeRows} />
            </div>
          </Band>
        </div>
        <Band tone="deep" class="home-closing" container>
          <ClosingBand vendor={vendor} priced={hasPrices(catchContent)} />
        </Band>
        <Footer container />
        {vendor?.phone ? (
          <ActionBar
            items={[
              { href: telHref(vendor.phone), label: "Call" },
              { href: smsHref(vendor.phone), label: "Text" },
              { href: "/order", label: "Order" },
            ]}
          />
        ) : null}
        <script type="module" src={assetUrl("/js/favorites.js")}></script>
      </Page>
    </Document>,
  );
});
