import type { FC } from "hono/jsx";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export type VendorFormValues = { displayName?: string | null; phone?: string | null };

function asOptional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

/** Minimal admin/CRUD for the single `Vendor` row (issue #71) — displayName/phone only. */
export const VendorForm: FC<{ csrfToken: string; values?: VendorFormValues; errors?: Record<string, string> }> = ({
  csrfToken,
  values = {},
  errors = {},
}) => (
  <form method="post" action="/admin/vendor">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Input
      id="displayName"
      name="displayName"
      label="Display name"
      helperText='e.g. "Evan" — used for "Call Evan" copy.'
      value={asOptional(values.displayName)}
      errorText={errors.displayName}
    />
    <Input
      id="phone"
      name="phone"
      label="Phone"
      type="tel"
      inputMode="tel"
      helperText="E.164 format, e.g. +16625551234"
      value={asOptional(values.phone)}
      errorText={errors.phone}
    />
    <Button type="submit">Save</Button>
  </form>
);
