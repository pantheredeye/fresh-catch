import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import type { Market } from "@/lib/db";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { BackLink } from "@/ui/back-link";
import { SectionHeading } from "@/ui/section-heading";
import { getVendor } from "@/features/vendor/queries";
import { describeOccurrence, nextOccurrence } from "@/features/markets/status";
import { WEEKDAY_NAMES, formatHoursRange } from "@/lib/format";
import { getMarket, listPastPopups } from "./queries";
import { MarketDetail, type MarketDetailStatus } from "./components";

export const marketRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function marketAddressLine(market: Pick<Market, "address" | "landmark">): string | null {
  if (!market.address) return null;
  return market.landmark ? `${market.address}, ${market.landmark}` : market.address;
}

/**
 * C7: #56 owns this route + query end to end; #58 links it into customer
 * nav. Registered before `/markets/:id` below — Hono matches routes in
 * registration order, and this static path would otherwise be swallowed as
 * `id: "past"`.
 */
marketRoutes.get("/markets/past", async (c) => {
  const [popups, vendor] = await Promise.all([listPastPopups(), getVendor()]);
  return c.html(
    <Document title="Past popups — Fresh Catch">
      <BrandBar vendor={vendor} />
      <Page>
        <BackLink href="/">Back to Fresh Catch</BackLink>
        <SectionHeading title="Past popups" meta={`${popups.length} popup${popups.length === 1 ? "" : "s"}`} />
        {popups.length === 0 ? (
          <p class="muted">No past popups yet.</p>
        ) : (
          <div class="stack-tight">
            {popups.map((market) => (
              <div class="market-row">
                <span>
                  <strong>{market.name}</strong> — {market.schedule}
                </span>
                <span class="badge badge-past">Past</span>
              </div>
            ))}
          </div>
        )}
        <p>
          <a href="/requests/new?type=question">Ask about a market</a>
        </p>
      </Page>
      <Footer vendor={vendor} session={c.var.session} />
    </Document>,
  );
});

/** Public detail view (#58, restyled #74) — linked from the landing list; works for any market regardless of status. */
marketRoutes.get("/markets/:id", async (c) => {
  const market = await getMarket(c.req.param("id"));
  if (!market) return c.text("Not found", 404);

  const vendor = await getVendor();
  const tz = vendor?.timezone ?? "America/Chicago";
  const now = new Date();
  const occurrence = nextOccurrence(market, now, tz);

  const dayLabel = market.type === "regular" && market.dayOfWeek !== null ? WEEKDAY_NAMES[market.dayOfWeek] : null;
  const hoursLine =
    market.dayOfWeek !== null && market.openMinutes !== null && market.closeMinutes !== null
      ? formatHoursRange(market.openMinutes, market.closeMinutes)
      : market.schedule;
  const status: MarketDetailStatus = occurrence
    ? {
        open: occurrence.state === "open-now",
        label: occurrence.state === "open-now" ? "Open now" : "Closed",
        message: describeOccurrence(occurrence, now, tz),
      }
    : null;
  const endedNote = market.type === "popup" && !occurrence ? "This popup has ended." : null;

  return c.html(
    <Document title={`${market.name} — Fresh Catch`} deviceToken={c.var.deviceToken}>
      <MarketDetail
        market={market}
        vendor={vendor}
        session={c.var.session}
        dayLabel={dayLabel}
        hoursLine={hoursLine}
        addressLine={marketAddressLine(market)}
        status={status}
        endedNote={endedNote}
      />
    </Document>,
  );
});
