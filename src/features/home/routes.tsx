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
} from "@/features/markets/status";
import {
  WEEKDAY_NAMES,
  formatHoursRange,
  formatWeekOf,
  localParts,
  smsHref,
  telHref,
} from "@/lib/format";
import { assetUrl } from "@/lib/assets";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { ActionBar } from "@/ui/action-bar";
import { ClosingBand, FishBoard, hasPrices, RouteBand, SavedBand, type RouteRow, type SavedPin } from "./components";
import { hasValidHours, marketAddressLine } from "@/features/markets/display";

export const homeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

  const routeRows = buildRouteRows(regularMarkets, livePopups, now, tz);
  const savedPins = buildSavedPins([...livePopups, ...regularMarkets], now, tz);

  return c.html(
    <Document deviceToken={c.var.deviceToken}>
      <Page bleed>
        <BrandBar vendor={vendor} session={c.var.session} container />
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
