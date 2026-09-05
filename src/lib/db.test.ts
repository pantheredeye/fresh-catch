import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { setupDb, db } from "./db";
import type { Bindings } from "../types";

describe("db", () => {
  it("queries D1 through Prisma against the migrated schema", async () => {
    await setupDb(env as unknown as Bindings);

    await db.vendor.create({
      data: { id: "test-vendor", name: "Test Vendor" },
    });

    const vendor = await db.vendor.findUniqueOrThrow({ where: { id: "test-vendor" } });
    expect(vendor.name).toBe("Test Vendor");
  });
});
