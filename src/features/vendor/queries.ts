import { db } from "@/lib/db";
import type { Vendor } from "@/lib/db";
import type { VendorInput } from "./validation";

/** Single-vendor app (see `prisma/seed.sql`) — always exactly one row. */
export function getVendor(): Promise<Vendor | null> {
  return db.vendor.findFirst();
}

export function updateVendor(id: string, data: VendorInput): Promise<Vendor> {
  return db.vendor.update({ where: { id }, data });
}
