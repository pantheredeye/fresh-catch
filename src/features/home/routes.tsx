import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { getLiveCatchUpdate, isCatchUpdateFresh } from "@/features/catch/queries";
import { parseCatchContent } from "@/features/catch/pipeline";
import { listActiveMarkets, listLivePopups } from "@/features/markets/queries";
import { PublicMarketCard } from "@/features/markets/components";
import { CatchHero, HomeNav } from "./components";

export const homeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

homeRoutes.get("/", async (c) => {
  const session = c.var.session;
  const [live, regularMarkets, livePopups] = await Promise.all([
    getLiveCatchUpdate(),
    listActiveMarkets(),
    listLivePopups(),
  ]);
  const catchContent = live && isCatchUpdateFresh(live) ? parseCatchContent(live.formattedContent) : null;

  return c.html(
    <Document deviceToken={c.var.deviceToken}>
      <main class="page stack">
        <HomeNav session={session} />
        <h1>Fresh Catch</h1>
        <CatchHero content={catchContent} />

        <section class="stack">
          <h2>Markets</h2>
          {regularMarkets.length === 0 && livePopups.length === 0 ? <p>No markets posted yet.</p> : null}
          <div class="stack">
            {livePopups.map((market) => (
              <PublicMarketCard market={market} kind="live-popup" />
            ))}
            {regularMarkets.map((market) => (
              <PublicMarketCard market={market} kind="regular" />
            ))}
          </div>
          <p>
            <a href="/markets/past">Past popups →</a>
          </p>
        </section>

        <script type="module" src="/js/favorites.js"></script>
      </main>
    </Document>,
  );
});
