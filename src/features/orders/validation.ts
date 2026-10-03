import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "venmo", "zelle", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function flattenErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  return errors;
}

/** Dollars-string form input → integer cents. Rejects non-numeric, negative, and zero. */
const dollarsToCents = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)), `${label} must be a number`)
    .transform((v) => Math.round(Number(v) * 100))
    .refine((v) => v > 0, `${label} must be greater than 0`);

/** Same shape, but empty string is a valid "no deposit" — only validates the number when present. */
const optionalDollarsToCents = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined))
    .refine((v) => v === undefined || !Number.isNaN(Number(v)), `${label} must be a number`)
    .transform((v) => (v === undefined ? null : Math.round(Number(v) * 100)))
    .refine((v) => v === null || v > 0, `${label} must be greater than 0`);

export const confirmOrderSchema = z.object({
  price: dollarsToCents("Price"),
  deposit: optionalDollarsToCents("Deposit"),
  adminNotes: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type ConfirmOrderResult =
  | { success: true; data: { priceCents: number; depositCents: number | null; adminNotes: string | null } }
  | { success: false; errors: Record<string, string> };

export function parseConfirmOrderForm(raw: Record<string, unknown>): ConfirmOrderResult {
  const result = confirmOrderSchema.safeParse(raw);
  if (!result.success) return { success: false, errors: flattenErrors(result.error) };
  return {
    success: true,
    data: { priceCents: result.data.price, depositCents: result.data.deposit, adminNotes: result.data.adminNotes },
  };
}

export const markPaidSchema = z.object({
  amount: dollarsToCents("Amount"),
  method: z.enum(PAYMENT_METHODS),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type MarkPaidResult =
  | { success: true; data: { amountCents: number; method: PaymentMethod; notes: string | null } }
  | { success: false; errors: Record<string, string> };

export function parseMarkPaidForm(raw: Record<string, unknown>): MarkPaidResult {
  const result = markPaidSchema.safeParse(raw);
  if (!result.success) return { success: false, errors: flattenErrors(result.error) };
  return {
    success: true,
    data: { amountCents: result.data.amount, method: result.data.method, notes: result.data.notes },
  };
}
