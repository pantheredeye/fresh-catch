import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { listPastPopups } from "./queries";

export const marketRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** C7: #56 owns this route + query end to end; #58 links it into customer nav. */
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
