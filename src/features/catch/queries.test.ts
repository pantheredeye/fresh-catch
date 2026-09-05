import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import { getLiveCatchUpdate, publishCatchUpdate } from "./queries";

beforeAll(async () => {
  await setupDb(env as unknown as Bindings);
});

function content(headline: string) {
  return JSON.stringify({ headline, items: [{ name: "Cod", note: "" }], summary: "s" });
}

describe("publishCatchUpdate", () => {
  it("archives any prior live row and inserts the new one as live", async () => {
    const first = await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "t1",
      formattedContent: content("First"),
    });
    expect(first.status).toBe("live");

    const second = await publishCatchUpdate({
      recordedBy: "admin@example.com",
      rawTranscript: "t2",
      formattedContent: content("Second"),
    });
    expect(second.status).toBe("live");

    const refreshedFirst = await db.catchUpdate.findUnique({ where: { id: first.id } });
    expect(refreshedFirst?.status).toBe("archived");

    const live = await getLiveCatchUpdate();
    expect(live?.id).toBe(second.id);
  });
});

describe("getLiveCatchUpdate", () => {
  it("returns null when there is no live row", async () => {
    await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
    expect(await getLiveCatchUpdate()).toBeNull();
  });
});
