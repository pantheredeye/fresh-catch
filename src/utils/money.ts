/**
 * Money utilities — all amounts in integer cents
 */

export type FeeModel = "customer" | "vendor" | "split";

/**
 * Format cents as dollar string: 4500 → '$45.00'
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Parse dollar string or number to cents: '$45.50' → 4550, '45' → 4500
 */
export function parseDollars(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) {
    throw new Error(`Invalid dollar amount: ${input}`);
  }
  return Math.round(dollars * 100);
}

/**
 * Calculate platform fee split.
 *
 * @param priceCents - base price in cents
 * @param feeBps - fee in basis points (500 = 5%)
 * @param feeModel - who absorbs the fee
 *   - customer: fee added on top of price
 *   - vendor: fee deducted from vendor's share
 *   - split: fee split 50/50 between customer and vendor
 */
export function calculatePlatformFee(
  priceCents: number,
  feeBps: number,
  feeModel: FeeModel,
): { customerTotal: number; vendorReceives: number; platformFee: number } {
  const platformFee = Math.round((priceCents * feeBps) / 10000);

  switch (feeModel) {
    case "customer":
      return {
        customerTotal: priceCents + platformFee,
        vendorReceives: priceCents,
        platformFee,
      };
    case "vendor":
      return {
        customerTotal: priceCents,
        vendorReceives: priceCents - platformFee,
        platformFee,
      };
    case "split": {
      const customerShare = Math.round(platformFee / 2);
      const vendorShare = platformFee - customerShare;
      return {
        customerTotal: priceCents + customerShare,
        vendorReceives: priceCents - vendorShare,
        platformFee,
      };
    }
  }
}
