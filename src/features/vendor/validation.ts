import { z } from "zod";

export const VENDOR_FIELD_LIMITS = {
  phone: 20,
  displayName: 100,
} as const;

/** Loose E.164 check — leading `+` optional, 7-15 digits (ITU E.164 max). */
const PHONE_RE = /^\+?\d{7,15}$/;

function optionalTrimmed(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null));
}

const vendorFormSchema = z
  .object({
    displayName: optionalTrimmed(VENDOR_FIELD_LIMITS.displayName),
    phone: optionalTrimmed(VENDOR_FIELD_LIMITS.phone),
  })
  .refine((data) => !data.phone || PHONE_RE.test(data.phone), {
    message: "Enter a valid phone number, e.g. +16625551234",
    path: ["phone"],
  });

export type VendorInput = { displayName: string | null; phone: string | null };
export type VendorFormResult = { success: true; data: VendorInput } | { success: false; errors: Record<string, string> };

/** Parses the vendor settings form (`POST /admin/vendor`) — phone/displayName only (issue #71; timezone stays a schema default, not yet admin-editable). */
export function parseVendorForm(raw: Record<string, unknown>): VendorFormResult {
  const result = vendorFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const errors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) errors[field] = messages[0];
    }
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
