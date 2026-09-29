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
import { splitExpiresAt, splitHours } from "./validation";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

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

const HOUR_OPTIONS_WITH_UNSET = [UNSET_OPTION, ...HOUR_OPTIONS];

const MINUTE_OPTIONS = [
  UNSET_OPTION,
  { value: "0", label: ":00" },
  { value: "15", label: ":15" },
  { value: "30", label: ":30" },
  { value: "45", label: ":45" },
];

export type MarketFormValues = {
  name?: string;
  schedule?: string;
  subtitle?: string | null;
  locationDetails?: string | null;
  customerInfo?: string | null;
  catchPreview?: string | null;
  notes?: string | null;
  county?: string | null;
  city?: string | null;
  address?: string | null;
  landmark?: string | null;
  dayOfWeek?: string;
  openHour?: string;
  openMinute?: string;
  closeHour?: string;
  closeMinute?: string;
  expiresDate?: string;
  expiresHour?: string;
};

function asOptional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

/** Turns a stored `Market` row into the form's flat string values, splitting `expiresAt` per C5. */
export function marketToFormValues(market: Market): MarketFormValues {
  const { expiresDate, expiresHour } = splitExpiresAt(market.expiresAt);
  const hours = splitHours(market);
  return {
    name: market.name,
    schedule: market.schedule,
    subtitle: market.subtitle,
    locationDetails: market.locationDetails,
    customerInfo: market.customerInfo,
    catchPreview: market.catchPreview,
    notes: market.notes,
    county: market.county,
    city: market.city,
    address: market.address,
    landmark: market.landmark,
    ...hours,
    expiresDate,
    expiresHour,
  };
}

/** One form for both market types (C1) — `type` decides whether the expiry fields render. */
export const MarketForm: FC<{
  type: "regular" | "popup";
  action: string;
  csrfToken: string;
  values?: MarketFormValues;
  errors?: Record<string, string>;
}> = ({ type, action, csrfToken, values = {}, errors = {} }) => (
  <form method="post" action={action}>
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <input type="hidden" name="type" value={type} />
    <Input id="name" name="name" label="Name" required value={values.name} errorText={errors.name} />
    <Input
      id="schedule"
      name="schedule"
      label="Schedule"
      required
      value={values.schedule}
      helperText='e.g. "Sat 8-2"'
      errorText={errors.schedule}
    />
    <Input
      id="subtitle"
      name="subtitle"
      label="Subtitle"
      value={asOptional(values.subtitle)}
      errorText={errors.subtitle}
    />
    <Input id="county" name="county" label="County" value={asOptional(values.county)} errorText={errors.county} />
    <Input id="city" name="city" label="City" value={asOptional(values.city)} errorText={errors.city} />
    <Input
      id="address"
      name="address"
      label="Address"
      value={asOptional(values.address)}
      errorText={errors.address}
    />
    <Input
      id="landmark"
      name="landmark"
      label="Landmark"
      helperText='e.g. "Next to the gas station"'
      value={asOptional(values.landmark)}
      errorText={errors.landmark}
    />
    <Select
      id="dayOfWeek"
      name="dayOfWeek"
      label="Day"
      helperText="Set day + open/close together, or leave all blank — schedule text above still shows either way."
      value={values.dayOfWeek ?? ""}
      options={DAY_OPTIONS}
      errorText={errors.dayOfWeek}
    />
    <div class="cluster">
      <Select
        id="openHour"
        name="openHour"
        label="Open hour"
        value={values.openHour ?? ""}
        options={HOUR_OPTIONS_WITH_UNSET}
        errorText={errors.openHour}
      />
      <Select
        id="openMinute"
        name="openMinute"
        label="Open minute"
        value={values.openMinute ?? ""}
        options={MINUTE_OPTIONS}
        errorText={errors.openMinute}
      />
    </div>
    <div class="cluster">
      <Select
        id="closeHour"
        name="closeHour"
        label="Close hour"
        value={values.closeHour ?? ""}
        options={HOUR_OPTIONS_WITH_UNSET}
        errorText={errors.closeHour}
      />
      <Select
        id="closeMinute"
        name="closeMinute"
        label="Close minute"
        value={values.closeMinute ?? ""}
        options={MINUTE_OPTIONS}
        errorText={errors.closeMinute}
      />
    </div>
    {type === "popup" ? (
      <>
        <Input
          id="expiresDate"
          name="expiresDate"
          type="date"
          label="Expires (UTC)"
          required
          value={values.expiresDate}
          errorText={errors.expiresDate}
        />
        <Select
          id="expiresHour"
          name="expiresHour"
          label="Expires hour (UTC)"
          required
          value={values.expiresHour ?? "23"}
          options={HOUR_OPTIONS}
          errorText={errors.expiresHour}
        />
      </>
    ) : null}
    <Textarea
      id="locationDetails"
      name="locationDetails"
      label="Location details (vendor-facing)"
      helperText="Booth location, setup notes, parking info."
      value={asOptional(values.locationDetails)}
      errorText={errors.locationDetails}
    />
    <Textarea
      id="customerInfo"
      name="customerInfo"
      label="Customer info"
      helperText="Payment methods, what to bring, best times."
      value={asOptional(values.customerInfo)}
      errorText={errors.customerInfo}
    />
    <Textarea
      id="catchPreview"
      name="catchPreview"
      label="Catch preview"
      value={asOptional(values.catchPreview)}
      errorText={errors.catchPreview}
    />
    <Textarea
      id="notes"
      name="notes"
      label="Notes"
      value={asOptional(values.notes)}
      errorText={errors.notes}
    />
    <Button type="submit">Save</Button>
  </form>
);

export const StatusBadge: FC<{ status: "active" | "inactive" | "live" | "past" }> = ({ status }) => {
  const label = { active: "Active", inactive: "Inactive", live: "Live", past: "Past" }[status];
  const className = status === "active" || status === "live" ? "badge-live" : "badge-past";
  return <span class={`badge ${className}`}>{label}</span>;
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
      <StatusBadge status={status} />
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
          <BackLink href="/">Back to Fresh Catch</BackLink>
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
      <script type="module" src="/js/favorites.js"></script>
    </Page>
  );
};
