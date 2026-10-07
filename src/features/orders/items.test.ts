import { describe, expect, it } from "vitest";
import type { FishRequest, RequestItem } from "@/lib/db";
import { parseOrderItems, snapshotOrderItems } from "./items";

function requestItem(overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    id: crypto.randomUUID(),
    requestId: "r1",
    position: 0,
    species: "Halibut",
    quantity: "2 lbs",
    notes: null,
    isCustom: false,
    status: "requested",
    priceCents: null,
    marketRate: false,
    vendorNote: null,
    ...overrides,
  };
}

describe("snapshotOrderItems → parseOrderItems round trip", () => {
  it("freezes items and order notes in the v2 shape", () => {
    const request = { notes: "Saturday pickup" } as FishRequest;
    const items = [
      requestItem(),
      requestItem({ position: 1, species: "Wahoo", quantity: null, notes: "filleted", isCustom: true, priceCents: 2400 }),
    ];

    const parsed = parseOrderItems(snapshotOrderItems(request, items));

    expect(parsed).toEqual({
      version: 2,
      items: [
        {
          species: "Halibut",
          quantity: "2 lbs",
          notes: null,
          isCustom: false,
          status: "requested",
          priceCents: null,
          marketRate: false,
          vendorNote: null,
        },
        {
          species: "Wahoo",
          quantity: null,
          notes: "filleted",
          isCustom: true,
          status: "requested",
          priceCents: 2400,
          marketRate: false,
          vendorNote: null,
        },
      ],
      orderNotes: "Saturday pickup",
    });
  });
});

describe("parseOrderItems", () => {
  it("normalizes a v1 snapshot to one implicit item plus order notes", () => {
    const v1 = JSON.stringify({ requestType: "fish", species: "Halibut", quantity: "2 lbs", notes: "call ahead" });
    const parsed = parseOrderItems(v1);

    expect(parsed?.items).toEqual([
      {
        species: "Halibut",
        quantity: "2 lbs",
        notes: null,
        isCustom: false,
        status: "requested",
        priceCents: null,
        marketRate: false,
        vendorNote: null,
      },
    ]);
    expect(parsed?.orderNotes).toBe("call ahead");
  });

  it("maps a species-less v1 question snapshot to zero items", () => {
    const parsed = parseOrderItems(JSON.stringify({ requestType: "question", species: null, quantity: null, notes: "When?" }));
    expect(parsed?.items).toEqual([]);
    expect(parsed?.orderNotes).toBe("When?");
  });

  it("drops malformed v2 entries instead of erroring", () => {
    const parsed = parseOrderItems(JSON.stringify({ version: 2, items: [{ species: "Cod" }, { quantity: "1" }, null], orderNotes: 7 }));
    expect(parsed?.items).toEqual([
      {
        species: "Cod",
        quantity: null,
        notes: null,
        isCustom: false,
        status: "requested",
        priceCents: null,
        marketRate: false,
        vendorNote: null,
      },
    ]);
    expect(parsed?.orderNotes).toBeNull();
  });

  it("returns null for unparseable or unknown-version payloads", () => {
    expect(parseOrderItems("not json")).toBeNull();
    expect(parseOrderItems('"just a string"')).toBeNull();
    expect(parseOrderItems("[]")).toBeNull();
    expect(parseOrderItems(JSON.stringify({ version: 3, items: [] }))).toBeNull();
  });
});
