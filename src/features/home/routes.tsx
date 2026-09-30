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
  describeTodayStatus,
  isSameLocalDate,
  nextDifferentMarketByDay,
  nextOccurrence,
  resolveToday,
  type StatusMarket,
  type TodayStatus,
} from "@/features/markets/status";
import { WEEKDAY_NAMES, formatClockTime, formatFullDate, formatHoursRange, formatWeekOf, localParts } from "@/lib/format";
import { assetUrl } from "@/lib/assets";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { StatusStrip } from "@/ui/status-strip";
import { ClosingBand, FishBoard, Hero, RouteBand, SavedBand, type RouteRow, type SavedPin } from "./components";

export const homeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const STATUS_LABEL: Record<TodayStatus["kind"], string> = {
  open: "Open now",
  "opens-later": "Opens later today",
  "closed-today": "Closed today",
};

function marketAddressLine(market: Pick<Market, "address" | "landmark">): string | null {
  if (!market.address) return null;
  return market.landmark ? `${market.address}, ${market.landmark}` : market.address;
}

function heroHoursLine(market: Market, tz: string): string | null {
  if (market.type === "popup") {
    if (!market.expiresAt) return null;
    const local = localParts(market.expiresAt, tz);
    return `Until ${formatClockTime(local.hour * 60 + local.minute)}`;
  }
  if (market.dayOfWeek !== null && market.openMinutes !== null && market.closeMinutes !== null) {
    return formatHoursRange(market.openMinutes, market.closeMinutes);
  }
  return null;
}

function buildRouteRows(regularMarkets: Market[], livePopups: Market[], now: Date, tz: string): RouteRow[] {
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
        market.openMinutes !== null && market.closeMinutes !== null
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
    if (!occurrence) continue;
    pins.push({ marketId: market.id, name: market.name, description: describeOccurrence(occurrence, now, tz) });
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

  let heroMarket: Market | null = (status.market as Market | null) ?? (status.next?.market as Market | null) ?? null;
  let scheduleFallback = false;
  if (!heroMarket && regularMarkets.length > 0) {
    heroMarket = regularMarkets[0];
    scheduleFallback = true;
  }

  const dateLine = scheduleFallback
    ? null
    : status.kind === "closed-today" && status.next
      ? `No market today. Next stop, ${WEEKDAY_NAMES[localParts(status.next.opensAt, tz).weekday]}:`
      : formatFullDate(now, tz);

  const then = heroMarket && !scheduleFallback ? nextDifferentMarketByDay(allMarkets, heroMarket.id, now, tz) : null;

  const routeRows = buildRouteRows(regularMarkets, livePopups, now, tz);
  const savedPins = buildSavedPins([...livePopups, ...regularMarkets], now, tz);

  return c.html(
    <Document deviceToken={c.var.deviceToken}>
      <Page bleed>
        <BrandBar vendor={vendor} />
        {!scheduleFallback ? (
          <StatusStrip
            open={status.kind === "open"}
            label={STATUS_LABEL[status.kind]}
            message={describeTodayStatus(status, now, tz)}
          />
        ) : null}
        <Band tone="shallow">
          <Hero
            market={heroMarket}
            scheduleFallback={scheduleFallback}
            dateLine={dateLine}
            hoursLine={heroMarket ? heroHoursLine(heroMarket, tz) : null}
            addressLine={heroMarket ? marketAddressLine(heroMarket) : null}
            then={then}
            vendor={vendor}
          />
        </Band>
        <SavedBand pins={savedPins} />
        <Band tone="sand">
          <FishBoard content={catchContent} weekOf={weekOf} />
        </Band>
        <Band tone="paper">
          <RouteBand rows={routeRows} vendor={vendor} />
        </Band>
        <Band tone="deep">
          <ClosingBand vendor={vendor} />
        </Band>
        <Footer vendor={vendor} session={session} />
        <script type="module" src={assetUrl("/js/favorites.js")}></script>
      </Page>
    </Document>,
  );
});
