import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Button } from "@/ui/button";
import { Page } from "@/ui/page";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import { cancelMarket, createMarket, getMarket, listActiveMarkets, listLivePopups, updateMarket } from "./queries";
import { parseMarketForm } from "./validation";
import { MarketForm, MarketRow, marketToFormValues, type MarketFormValues } from "./components";

export const marketsAdminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

marketsAdminRoutes.use("/admin/markets", requireAdmin());
marketsAdminRoutes.use("/admin/markets/*", requireAdmin());

function marketKind(type: string | undefined): "regular" | "popup" {
  return type === "popup" ? "popup" : "regular";
}

function formString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function rawToFormValues(raw: Record<string, unknown>): MarketFormValues {
  return {
    name: formString(raw.name),
    schedule: formString(raw.schedule),
    subtitle: formString(raw.subtitle),
    locationDetails: formString(raw.locationDetails),
    customerInfo: formString(raw.customerInfo),
    catchPreview: formString(raw.catchPreview),
    notes: formString(raw.notes),
    county: formString(raw.county),
    city: formString(raw.city),
    expiresDate: formString(raw.expiresDate),
    expiresHour: formString(raw.expiresHour),
  };
}

marketsAdminRoutes.get("/admin/markets", async (c) => {
  const [regular, popups] = await Promise.all([listActiveMarkets(), listLivePopups()]);
  return c.html(
    <Document title="Markets — Admin">
      <Page>
        <h1>Markets</h1>
        <p style="display: flex; gap: 12px;">
          <Button href="/admin/markets/new?type=regular">New market</Button>
          <Button href="/admin/markets/new?type=popup" variant="secondary">
            New popup
          </Button>
        </p>

        <section>
          <h2>Regular markets</h2>
          <div class="stack">
            {regular.length === 0 ? <p>No active markets yet.</p> : null}
            {regular.map((market) => (
              <MarketRow market={market} status="active" />
            ))}
          </div>
        </section>

        <section>
          <h2>Live popups</h2>
          <div class="stack">
            {popups.length === 0 ? <p>No live popups.</p> : null}
            {popups.map((market) => (
              <MarketRow market={market} status="live" />
            ))}
          </div>
          <p>
            <a href="/markets/past">Past popups →</a>
          </p>
        </section>
      </Page>
    </Document>,
  );
});

marketsAdminRoutes.get("/admin/markets/new", (c) => {
  const type = marketKind(c.req.query("type"));
  const csrfToken = c.var.session!.csrfToken;
  return c.html(
    <Document title={type === "popup" ? "New popup — Admin" : "New market — Admin"}>
      <Page>
        <h1>{type === "popup" ? "New popup" : "New market"}</h1>
        <MarketForm type={type} action="/admin/markets" csrfToken={csrfToken} />
      </Page>
    </Document>,
  );
});

marketsAdminRoutes.post("/admin/markets", csrfProtect(), async (c) => {
  const body = await c.req.parseBody();
  const type = marketKind(formString(body.type));
  const result = parseMarketForm(body);

  if (!result.success) {
    return c.html(
      <Document title={type === "popup" ? "New popup — Admin" : "New market — Admin"}>
        <Page>
          <h1>{type === "popup" ? "New popup" : "New market"}</h1>
          <MarketForm
            type={type}
            action="/admin/markets"
            csrfToken={c.var.session!.csrfToken}
            values={rawToFormValues(body)}
            errors={result.errors}
          />
        </Page>
      </Document>,
      400,
    );
  }

  await createMarket(result.data);
  return c.redirect("/admin/markets");
});

marketsAdminRoutes.get("/admin/markets/:id/edit", async (c) => {
  const market = await getMarket(c.req.param("id"));
  if (!market) return c.text("Not found", 404);
  const type = marketKind(market.type);

  return c.html(
    <Document title={`Edit ${market.name} — Admin`}>
      <Page>
        <h1>Edit {market.name}</h1>
        <MarketForm
          type={type}
          action={`/admin/markets/${market.id}`}
          csrfToken={c.var.session!.csrfToken}
          values={marketToFormValues(market)}
        />
        <form method="post" action={`/admin/markets/${market.id}/cancel`}>
          <input type="hidden" name="csrfToken" value={c.var.session!.csrfToken} />
          <Button type="submit" variant="secondary">
            {type === "popup" ? "Cancel popup" : "Deactivate market"}
          </Button>
        </form>
      </Page>
    </Document>,
  );
});

marketsAdminRoutes.post("/admin/markets/:id", csrfProtect(), async (c) => {
  const id = c.req.param("id");
  const market = await getMarket(id);
  if (!market) return c.text("Not found", 404);
  const type = marketKind(market.type);

  const body = await c.req.parseBody();
  // Type is fixed at creation — force it from the stored row rather than the
  // resubmitted hidden field, so an edit can't smuggle a type change.
  const result = parseMarketForm({ ...body, type });

  if (!result.success) {
    return c.html(
      <Document title={`Edit ${market.name} — Admin`}>
        <Page>
          <h1>Edit {market.name}</h1>
          <MarketForm
            type={type}
            action={`/admin/markets/${id}`}
            csrfToken={c.var.session!.csrfToken}
            values={rawToFormValues(body)}
            errors={result.errors}
          />
        </Page>
      </Document>,
      400,
    );
  }

  await updateMarket(id, result.data);
  return c.redirect("/admin/markets");
});

marketsAdminRoutes.post("/admin/markets/:id/cancel", csrfProtect(), async (c) => {
  const result = await cancelMarket(c.req.param("id"));
  if (!result) return c.text("Not found", 404);
  return c.redirect("/admin/markets");
});
