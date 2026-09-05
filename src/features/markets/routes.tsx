import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { deriveMarketStatus, getMarket, listPastPopups } from "./queries";
import { MarketDetail } from "./components";

export const marketRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * C7: #56 owns this route + query end to end; #58 links it into customer
 * nav. Registered before `/markets/:id` below — Hono matches routes in
 * registration order, and this static path would otherwise be swallowed as
 * `id: "past"`.
 */
marketRoutes.get("/markets/past", async (c) => {
  const popups = await listPastPopups();
  return c.html(
    <Document title="Past popups — Fresh Catch">
      <main class="page">
        <h1>Past popups</h1>
        <div class="stack">
          {popups.length === 0 ? <p>No past popups yet.</p> : null}
          {popups.map((market) => (
            <div class="market-row">
              <span>
                <strong>{market.name}</strong> — {market.schedule}
              </span>
              <span class="badge badge-past">Past</span>
            </div>
          ))}
        </div>
      </main>
    </Document>,
  );
});

/** Public detail view (#58) — linked from the landing list; works for any market regardless of status. */
marketRoutes.get("/markets/:id", async (c) => {
  const market = await getMarket(c.req.param("id"));
  if (!market) return c.text("Not found", 404);
  return c.html(
    <Document title={`${market.name} — Fresh Catch`} deviceToken={c.var.deviceToken}>
      <MarketDetail market={market} status={deriveMarketStatus(market)} />
    </Document>,
  );
});
