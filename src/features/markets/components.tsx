import type { FC } from "hono/jsx";
import type { Market, Vendor } from "@/lib/db";
import type { SessionPayload } from "@/features/auth/session";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { Page } from "@/ui/page";
import { Band } from "@/ui/band";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { StatusStrip } from "@/ui/status-strip";
import { CardHeader } from "@/ui/card-header";
import { BackLink } from "@/ui/back-link";
import { SplitControl } from "@/ui/split-control";
import { mapsHref, telHref, vendorDisplayName } from "@/lib/format";
import { assetUrl } from "@/lib/assets";
import { Fieldset } from "@/ui/fieldset";
import { Disclosure } from "@/ui/disclosure";
import { ErrorSummary } from "@/ui/error-summary";
import { splitExpiresAt, splitHours } from "./validation";

const UNSET_OPTION = { value: "", label: "—" };

const DAY_OPTIONS = [
  UNSET_OPTION,
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

/** 96 × 15-min steps, labelled "6:00 pm" (`formatClockTime` gives "6pm" — spell the minutes out for a picker). */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const minutes = i * 15;
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { value: String(minutes), label: `${h12}:${String(minutes % 60).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}` };
});

const TIME_OPTIONS_WITH_UNSET = [UNSET_OPTION, ...TIME_OPTIONS];

export type MarketFormValues = {
  name?: string;
  schedule?: string;
  customerInfo?: string | null;
  catchPreview?: string | null;
  notes?: string | null;
  county?: string | null;
  city?: string | null;
  address?: string | null;
  landmark?: string | null;
  dayOfWeek?: string;
  openTime?: string;
  closeTime?: string;
  expiresDate?: string;
  expiresTime?: string;
};

function asOptional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function joinBlocks(...parts: (string | null)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join("\n\n");
}

/** Turns a stored `Market` row into the form's flat string values. Legacy `subtitle` / `locationDetails` have no field of their own anymore — they're folded into the note fields so they survive the next save. */
export function marketToFormValues(market: Market, tz: string, now: Date): MarketFormValues {
  const { expiresDate, expiresTime } = splitExpiresAt(market.expiresAt, tz, now);
  return {
    name: market.name,
    schedule: market.schedule,
    customerInfo: joinBlocks(market.subtitle, market.customerInfo),
    catchPreview: market.catchPreview,
    notes: joinBlocks(market.locationDetails, market.notes),
    county: market.county,
    city: market.city,
    address: market.address,
    landmark: market.landmark,
    ...splitHours(market),
    expiresDate: market.type === "popup" ? expiresDate : "",
    expiresTime,
  };
}

/** Values for a brand-new form — popups default to today 6:00 pm local. */
export function newMarketFormValues(type: "regular" | "popup", tz: string, now: Date): MarketFormValues {
  if (type !== "popup") return {};
  return splitExpiresAt(null, tz, now);
}

const FIELD_ORDER = [
  "name",
  "schedule",
  "landmark",
  "address",
  "city",
  "county",
  "expiresDate",
  "expiresTime",
  "dayOfWeek",
  "openTime",
  "closeTime",
  "customerInfo",
  "catchPreview",
  "notes",
];
const ADVANCED_FIELDS = ["dayOfWeek", "openTime", "closeTime", "customerInfo", "catchPreview", "notes"];

/** Admin form for both market types — Basics / Where / (popup) When it ends / collapsed Advanced. */
export const MarketForm: FC<{
  type: "regular" | "popup";
  action: string;
  csrfToken: string;
  values?: MarketFormValues;
  errors?: Record<string, string>;
  /** Local today (YYYY-MM-DD) — the earliest selectable end date; the server check stays authoritative. */
  minDate?: string;
}> = ({ type, action, csrfToken, values = {}, errors = {}, minDate }) => {
  const summary = FIELD_ORDER.filter((id) => errors[id]).map((id) => ({ id, message: errors[id] }));
  const firstError = summary[0]?.id;
  const focus = (id: string) => id === firstError;
  const advancedOpen =
    ADVANCED_FIELDS.some((id) => errors[id]) ||
    Boolean(values.dayOfWeek || values.customerInfo || values.catchPreview || values.notes);
  return (
    <form method="post" action={action}>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="type" value={type} />
      <ErrorSummary items={summary} />

      <Fieldset legend="Basics">
        <Input id="name" name="name" label="Name" required autofocus={focus("name")} value={values.name} errorText={errors.name} />
        <Input
          id="schedule"
          name="schedule"
          label="Schedule"
          required
          autofocus={focus("schedule")}
          value={values.schedule}
          helperText="How it reads to customers, e.g. Saturdays 8–2"
          errorText={errors.schedule}
        />
        <Input
          id="landmark"
          name="landmark"
          label="Landmark"
          autofocus={focus("landmark")}
          helperText='e.g. "Next to the gas station"'
          value={asOptional(values.landmark)}
          errorText={errors.landmark}
        />
      </Fieldset>

      <Fieldset legend="Where">
        <Input
          id="address"
          name="address"
          label="Address"
          autofocus={focus("address")}
          helperText="Street address turns on the Directions button"
          value={asOptional(values.address)}
          errorText={errors.address}
        />
        <Input id="city" name="city" label="City" autofocus={focus("city")} value={asOptional(values.city)} errorText={errors.city} />
        <Input
          id="county"
          name="county"
          label="County"
          autofocus={focus("county")}
          value={asOptional(values.county)}
          errorText={errors.county}
        />
      </Fieldset>

      {type === "popup" ? (
        <Fieldset legend="When it ends">
          <Input
            id="expiresDate"
            name="expiresDate"
            type="date"
            label="Ends on"
            required
            min={minDate}
            autofocus={focus("expiresDate")}
            value={values.expiresDate}
            errorText={errors.expiresDate}
          />
          <Select
            id="expiresTime"
            name="expiresTime"
            label="Ends at"
            required
            autofocus={focus("expiresTime")}
            value={values.expiresTime ?? "1080"}
            options={TIME_OPTIONS}
            errorText={errors.expiresTime}
          />
        </Fieldset>
      ) : null}

      <Disclosure summary="Advanced" open={advancedOpen}>
        {type === "regular" ? (
          <>
            <Select
              id="dayOfWeek"
              name="dayOfWeek"
              label="Day"
              autofocus={focus("dayOfWeek")}
              helperText="Day, opens, and closes go together — or leave all blank. Turns on “open now” status."
              value={values.dayOfWeek ?? ""}
              options={DAY_OPTIONS}
              errorText={errors.dayOfWeek}
            />
            <Select
              id="openTime"
              name="openTime"
              label="Opens"
              autofocus={focus("openTime")}
              value={values.openTime ?? ""}
              options={TIME_OPTIONS_WITH_UNSET}
              errorText={errors.openTime}
            />
            <Select
              id="closeTime"
              name="closeTime"
              label="Closes"
              autofocus={focus("closeTime")}
              value={values.closeTime ?? ""}
              options={TIME_OPTIONS_WITH_UNSET}
              errorText={errors.closeTime}
            />
          </>
        ) : null}
        <Textarea
          id="customerInfo"
          name="customerInfo"
          label="Note for customers"
          helperText="Payment methods, what to bring, best times."
          autofocus={focus("customerInfo")}
          value={asOptional(values.customerInfo)}
          errorText={errors.customerInfo}
        />
        <Textarea
          id="catchPreview"
          name="catchPreview"
          label="Catch preview"
          autofocus={focus("catchPreview")}
          value={asOptional(values.catchPreview)}
          errorText={errors.catchPreview}
        />
        <Textarea
          id="notes"
          name="notes"
          label="Private notes"
          helperText="Only you see these — booth location, setup, parking."
          autofocus={focus("notes")}
          value={asOptional(values.notes)}
          errorText={errors.notes}
        />
      </Disclosure>

      <Button type="submit">Save</Button>
    </form>
  );
};

/** Badges flag exceptions only — a healthy (active/live) market gets none. */
export const StatusBadge: FC<{ status: "active" | "inactive" | "live" | "past" }> = ({ status }) => {
  if (status === "active" || status === "live") return null;
  return <span class="badge badge-past">{status === "inactive" ? "Inactive" : "Past"}</span>;
};

export const MarketRow: FC<{ market: Market; status: "active" | "inactive" | "live" | "past" }> = ({
  market,
  status,
}) => (
  <div class="market-row">
    <span>
      <strong>{market.name}</strong> — {market.schedule}
    </span>
    <span class="cluster">
      {status === "past" && market.type === "popup" ? (
        <span class="badge badge-past">{market.cancelledAt ? "Cancelled" : "Ended"}</span>
      ) : (
        <StatusBadge status={status} />
      )}
      <a href={`/admin/markets/${market.id}/edit`}>Edit</a>
    </span>
  </div>
);

function marketLocation(market: Market): string | null {
  const parts = [market.city, market.county].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
}

/** Favoriting is client-side only (localStorage island, #58) — every card ships the same inert markup and `favorites.js` hydrates state on load. */
const FavoriteToggle: FC<{ marketId: string }> = ({ marketId }) => (
  <Button variant="ghost" class="favorite-toggle" data={{ "market-id": marketId }} ariaPressed={false}>
    <span aria-hidden="true">☆</span> Save
  </Button>
);

/** Open/closed status for one specific market — `null` when there's no computable occurrence (schedule-only market). */
export type MarketDetailStatus = { open: boolean; label: string; message: string } | null;

/** Public detail view for `GET /markets/:id` (bead #74) — hero-style header with spelled-out hours (#72) and a directions/call SplitControl, customer-facing fields only, no `locationDetails`/`notes`/`rawTranscript`. */
export const MarketDetail: FC<{
  market: Market;
  vendor: Vendor | null;
  session: SessionPayload | null;
  dayLabel: string | null;
  hoursLine: string | null;
  addressLine: string | null;
  status: MarketDetailStatus;
  endedNote: string | null;
}> = ({ market, vendor, session, dayLabel, hoursLine, addressLine, status, endedNote }) => {
  const name = vendorDisplayName(vendor);
  const location = marketLocation(market);
  const hasAddress = Boolean(market.address);
  const hasPhone = Boolean(vendor?.phone);
  return (
    <Page bleed>
      <BrandBar vendor={vendor} />
      {status ? <StatusStrip open={status.open} label={status.label} message={status.message} /> : null}
      <Band tone="shallow">
        <div class="stack">
          <BackLink href="/">Back to 2 Fishes Seafood</BackLink>
          {dayLabel ? <p class="hero-date">{dayLabel}</p> : null}
          <h1 class="h-display">{market.name}</h1>
          {hoursLine ? <p class="hero-hrs">{hoursLine}</p> : null}
          {addressLine ? <p class="hero-addr">{addressLine}</p> : null}
          {endedNote ? <p class="muted">{endedNote}</p> : null}
          {hasAddress && hasPhone ? (
            <SplitControl
              items={[
                { href: mapsHref(market.address!), label: "Directions", ariaLabel: `Directions to ${market.name}` },
                { href: telHref(vendor!.phone!), label: `Call ${name}`, ariaLabel: `Call ${name} about ${market.name}` },
              ]}
            />
          ) : hasAddress ? (
            <Button href={mapsHref(market.address!)}>Directions to {market.name}</Button>
          ) : hasPhone ? (
            <Button variant="secondary" href={telHref(vendor!.phone!)}>
              Call {name} about {market.name}
            </Button>
          ) : null}
        </div>
      </Band>
      <Band tone="paper">
        <div class="stack">
          {market.subtitle ? <p>{market.subtitle}</p> : null}
          {location ? <p class="muted">{location}</p> : null}
          {market.customerInfo ? <p>{market.customerInfo}</p> : null}
          {market.catchPreview ? (
            <div>
              <h2>Catch preview</h2>
              <p>{market.catchPreview}</p>
            </div>
          ) : null}
          <FavoriteToggle marketId={market.id} />
        </div>
      </Band>
      <Footer vendor={vendor} session={session} />
      <script type="module" src={assetUrl("/js/favorites.js")}></script>
    </Page>
  );
};
