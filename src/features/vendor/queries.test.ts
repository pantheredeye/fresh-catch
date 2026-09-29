import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import { getVendor, updateVendor } from "./queries";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

describe("getVendor / updateVendor (single-vendor app)", () => {
  it("returns the sole vendor row and updates phone/displayName in place", async () => {
    await db.vendor.deleteMany();
    const created = await db.vendor.create({ data: { id: "test-vendor", name: "Fresh Catch Seafood Markets" } });

    const fetched = await getVendor();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.timezone).toBe("America/Chicago");

    const updated = await updateVendor(created.id, { phone: "+16625551234", displayName: "Evan" });
    expect(updated.phone).toBe("+16625551234");
    expect(updated.displayName).toBe("Evan");
  });
});
