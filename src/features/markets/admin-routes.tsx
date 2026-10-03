import { Hono, type Context } from "hono";
import type { Market } from "@/lib/db";
import { formatClockTime, formatFullDate, localParts } from "@/lib/format";
import { getVendor } from "@/features/vendor/queries";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Button } from "@/ui/button";
import { SplitControl } from "@/ui/split-control";
import { Page } from "@/ui/page";
import { SectionHeading } from "@/ui/section-heading";
import { BackLink } from "@/ui/back-link";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import { cancelMarket, createMarket, getMarket, listActiveMarkets, listLivePopups, listPastPopups, updateMarket } from "./queries";
import { parseMarketForm } from "./validation";
import { MarketForm, MarketRow, marketToFormValues, newMarketFormValues, type MarketFormValues } from "./components";

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
    customerInfo: formString(raw.customerInfo),
    catchPreview: formString(raw.catchPreview),
    notes: formString(raw.notes),
    county: formString(raw.county),
    city: formString(raw.city),
    address: formString(raw.address),
    landmark: formString(raw.landmark),
    dayOfWeek: formString(raw.dayOfWeek),
    openTime: formString(raw.openTime),
    closeTime: formString(raw.closeTime),
    expiresDate: formString(raw.expiresDate),
    expiresTime: formString(raw.expiresTime),
  };
}

const DEFAULT_TZ = "America/Chicago";

function todayLocal(now: Date, tz: string): string {
  const p = localParts(now, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Success notice after a save/cancel redirect (`?saved=…&id=…`) — query param, no server state. */
function flashMessage(kind: string | undefined, market: Market | null, tz: string): string | null {
  if (!market || (kind !== "created" && kind !== "updated" && kind !== "cancelled")) return null;
  const noun = market.type === "popup" ? "Popup" : "Market";
  if (kind === "cancelled") {
    return market.type === "popup" ? `Popup cancelled — ${market.name}` : `Market deactivated — ${market.name}`;
  }
  if (market.type === "popup" && market.expiresAt) {
    const p = localParts(market.expiresAt, tz);
    return `${noun} saved — live until ${formatFullDate(market.expiresAt, tz)}, ${formatClockTime(p.hour * 60 + p.minute)}`;
  }
  return `${noun} saved — ${market.name}`;
}

marketsAdminRoutes.get("/admin/markets", async (c) => {
  const savedId = c.req.query("id");
  const [regular, popups, past, vendor, savedMarket] = await Promise.all([
    listActiveMarkets(),
    listLivePopups(),
    listPastPopups(10),
    getVendor(),
    savedId ? getMarket(savedId) : Promise.resolve(null),
  ]);
  const notice = flashMessage(c.req.query("saved"), savedMarket, vendor?.timezone ?? DEFAULT_TZ);
  return c.html(
    <Document title="Markets — Admin">
      <Page>
        <BackLink href="/admin">Admin</BackLink>
        <SectionHeading title="Markets" level={1} />
        {notice ? (
          <p class="notice notice-success" role="status">
            {notice}
          </p>
        ) : null}
        <div class="stack stack-section">
          <SplitControl
            items={[
              { href: "/admin/markets/new?type=regular", label: "New market", ariaLabel: "New market" },
              { href: "/admin/markets/new?type=popup", label: "New popup", ariaLabel: "New popup" },
            ]}
          />

          <section class="stack">
            <SectionHeading title="Regular markets" level={2} size="sm" />
            <div class="stack">
              {regular.length === 0 ? <p>No active markets yet.</p> : null}
              {regular.map((market) => (
                <MarketRow market={market} status="active" />
              ))}
            </div>
          </section>

          <section class="stack">
            <SectionHeading title="Live popups" level={2} size="sm" />
            <div class="stack">
              {popups.length === 0 ? <p>No live popups.</p> : null}
              {popups.map((market) => (
                <MarketRow market={market} status="live" />
              ))}
            </div>
          </section>

          <section class="stack">
            <SectionHeading title="Past popups" level={2} size="sm" />
            <div class="stack">
              {past.length === 0 ? <p>No past popups.</p> : null}
              {past.map((market) => (
                <MarketRow market={market} status="past" />
              ))}
            </div>
          </section>
        </div>
      </Page>
    </Document>,
  );
});

/** One render path for the create/edit form — used by the GET pages and the 400 re-render. */
function renderForm(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  opts: {
    title: string;
    heading: string;
    type: "regular" | "popup";
    action: string;
    values: MarketFormValues;
    errors?: Record<string, string>;
    tz: string;
    now: Date;
    market?: Market;
    status?: 200 | 400;
  },
) {
  const csrfToken = c.var.session!.csrfToken;
  return c.html(
    <Document title={opts.title}>
      <Page>
        <BackLink href="/admin/markets">Markets</BackLink>
        <SectionHeading title={opts.heading} level={1} />
        <MarketForm
          type={opts.type}
          action={opts.action}
          csrfToken={csrfToken}
          values={opts.values}
          errors={opts.errors}
          minDate={todayLocal(opts.now, opts.tz)}
        />
        {opts.market ? (
          <form method="post" action={`/admin/markets/${opts.market.id}/cancel`}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <Button type="submit" variant="secondary">
              {opts.type === "popup" ? "Cancel popup" : "Deactivate market"}
            </Button>
          </form>
        ) : null}
      </Page>
    </Document>,
    opts.status ?? 200,
  );
}

async function vendorTz(): Promise<string> {
  return (await getVendor())?.timezone ?? DEFAULT_TZ;
}

marketsAdminRoutes.get("/admin/markets/new", async (c) => {
  const type = marketKind(c.req.query("type"));
  const tz = await vendorTz();
  const now = new Date();
  return renderForm(c, {
    title: type === "popup" ? "New popup — Admin" : "New market — Admin",
    heading: type === "popup" ? "New popup" : "New market",
    type,
    action: "/admin/markets",
    values: newMarketFormValues(type, tz, now),
    tz,
    now,
  });
});

marketsAdminRoutes.post("/admin/markets", csrfProtect(), async (c) => {
  const body = await c.req.parseBody();
  const type = marketKind(formString(body.type));
  const tz = await vendorTz();
  const now = new Date();
  const result = parseMarketForm({ ...body, type }, { tz, now });

  if (!result.success) {
    return renderForm(c, {
      title: type === "popup" ? "New popup — Admin" : "New market — Admin",
      heading: type === "popup" ? "New popup" : "New market",
      type,
      action: "/admin/markets",
      values: rawToFormValues(body),
      errors: result.errors,
      tz,
      now,
      status: 400,
    });
  }

  const market = await createMarket(result.data);
  return c.redirect(`/admin/markets?saved=created&id=${market.id}`);
});

marketsAdminRoutes.get("/admin/markets/:id/edit", async (c) => {
  const market = await getMarket(c.req.param("id"));
  if (!market) return c.text("Not found", 404);
  const tz = await vendorTz();
  const now = new Date();
  return renderForm(c, {
    title: `Edit ${market.name} — Admin`,
    heading: `Edit ${market.name}`,
    type: marketKind(market.type),
    action: `/admin/markets/${market.id}`,
    values: marketToFormValues(market, tz, now),
    tz,
    now,
    market,
  });
});

marketsAdminRoutes.post("/admin/markets/:id", csrfProtect(), async (c) => {
  const id = c.req.param("id");
  const market = await getMarket(id);
  if (!market) return c.text("Not found", 404);
  const type = marketKind(market.type);

  const body = await c.req.parseBody();
  const tz = await vendorTz();
  const now = new Date();
  // Type is fixed at creation — force it from the stored row rather than the
  // resubmitted hidden field, so an edit can't smuggle a type change.
  const result = parseMarketForm({ ...body, type }, { tz, now, existingExpiresAt: market.expiresAt });

  if (!result.success) {
    return renderForm(c, {
      title: `Edit ${market.name} — Admin`,
      heading: `Edit ${market.name}`,
      type,
      action: `/admin/markets/${id}`,
      values: rawToFormValues(body),
      errors: result.errors,
      tz,
      now,
      market,
      status: 400,
    });
  }

  await updateMarket(id, result.data);
  return c.redirect(`/admin/markets?saved=updated&id=${id}`);
});

marketsAdminRoutes.post("/admin/markets/:id/cancel", csrfProtect(), async (c) => {
  const result = await cancelMarket(c.req.param("id"));
  if (!result) return c.text("Not found", 404);
  return c.redirect(`/admin/markets?saved=cancelled&id=${result.id}`);
});
