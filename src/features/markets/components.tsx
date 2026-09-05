import type { FC } from "hono/jsx";
import type { Market } from "@/lib/db";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { splitExpiresAt } from "./validation";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

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
  expiresDate?: string;
  expiresHour?: string;
};

function asOptional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

/** Turns a stored `Market` row into the form's flat string values, splitting `expiresAt` per C5. */
export function marketToFormValues(market: Market): MarketFormValues {
  const { expiresDate, expiresHour } = splitExpiresAt(market.expiresAt);
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
    <span style="display: flex; align-items: center; gap: 12px;">
      <StatusBadge status={status} />
      <a href={`/admin/markets/${market.id}/edit`}>Edit</a>
    </span>
  </div>
);
