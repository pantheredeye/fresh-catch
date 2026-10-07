import { describe, expect, it } from "vitest";
import {
  FIELD_LIMITS,
  MAX_REQUEST_ITEMS,
  parseItemResolutionForm,
  parseMessageForm,
  parseRequestForm,
  parseStatusUpdate,
  resolutionFieldId,
} from "./validation";

function fishFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "fish",
    "items[0].species": "Halibut",
    "items[0].quantity": "2 lbs",
    notes: "",
    contactName: "Jamie",
    contactEmail: "",
    contactPhone: "901-555-0100",
    ...overrides,
  };
}

function questionFields(overrides: Record<string, string> = {}) {
  return {
    requestType: "question",
    notes: "Do you have salmon this week?",
    contactName: "Jamie",
    contactEmail: "",
    contactPhone: "901-555-0100",
    ...overrides,
  };
}

describe("parseRequestForm", () => {
  it("accepts a minimal fish request (phone only)", () => {
    const result = parseRequestForm(fishFields());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        requestType: "fish",
        items: [{ species: "Halibut", quantity: "2 lbs", notes: null, isCustom: false }],
        notes: null,
        contactName: "Jamie",
        contactEmail: null,
        contactPhone: "901-555-0100",
      });
    }
  });

  it("parses multiple rows in index order, with per-item notes", () => {
    const result = parseRequestForm(
      fishFields({
        "items[1].species": "Grouper",
        "items[1].quantity": "",
        "items[1].notes": "filleted",
        "items[2].species": "Snapper",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([
        { species: "Halibut", quantity: "2 lbs", notes: null, isCustom: false },
        { species: "Grouper", quantity: null, notes: "filleted", isCustom: false },
        { species: "Snapper", quantity: null, notes: null, isCustom: false },
      ]);
    }
  });

  it("silently drops a fully blank row (abandoned Add tap)", () => {
    const result = parseRequestForm(fishFields({ "items[1].species": "", "items[1].quantity": "", "items[1].notes": "" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items).toHaveLength(1);
  });

  it("errors a row with a quantity but no species", () => {
    const result = parseRequestForm(fishFields({ "items[1].species": "", "items[1].quantity": "1 whole" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors["items-1-species"]).toBe("Species is required");
  });

  it("requires at least one non-blank row", () => {
    const result = parseRequestForm(fishFields({ "items[0].species": "", "items[0].quantity": "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors["items-0-species"]).toBe("Add at least one fish");
  });

  it(`rejects more than ${MAX_REQUEST_ITEMS} rows`, () => {
    const overrides: Record<string, string> = {};
    for (let i = 1; i <= MAX_REQUEST_ITEMS; i++) overrides[`items[${i}].species`] = `Fish ${i}`;
    const result = parseRequestForm(fishFields(overrides));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors["items-0-species"]).toContain(`${MAX_REQUEST_ITEMS}`);
  });

  it("requires at least one of email/phone", () => {
    const result = parseRequestForm(fishFields({ contactPhone: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.contactEmail).toBeTruthy();
  });

  it("uses speciesOther when species is the Other sentinel, flagged isCustom", () => {
    const result = parseRequestForm(fishFields({ "items[0].species": "__other", "items[0].speciesOther": " Wahoo " }));
    expect(result.success && result.data.items[0].species).toBe("Wahoo");
    expect(result.success && result.data.items[0].isCustom).toBe(true);
  });

  it("errors an Other row with no name", () => {
    const result = parseRequestForm(fishFields({ "items[0].species": "__other", "items[0].speciesOther": "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors["items-0-speciesOther"]).toBe("Enter the fish name");
  });

  it("does not flag an Other row whose typed name matches the live list", () => {
    const result = parseRequestForm(
      fishFields({ "items[0].species": "__other", "items[0].speciesOther": "halibut" }),
      { liveSpecies: ["Halibut"] },
    );
    expect(result.success && result.data.items[0].isCustom).toBe(false);
  });

  it("flags a species missing from liveSpecies as custom (sold out between load and submit)", () => {
    const live = { liveSpecies: ["Halibut", "Grouper"] };
    const onList = parseRequestForm(fishFields({ "items[0].species": "halibut" }), live);
    expect(onList.success && onList.data.items[0].isCustom).toBe(false);

    const offList = parseRequestForm(fishFields({ "items[0].species": "Mullet" }), live);
    expect(offList.success && offList.data.items[0].isCustom).toBe(true);
  });

  it("flags nothing when there is no live list at all", () => {
    const result = parseRequestForm(fishFields({ "items[0].species": "Mullet" }), { liveSpecies: [] });
    expect(result.success && result.data.items[0].isCustom).toBe(false);
  });

  it("accepts a question request with no items", () => {
    const result = parseRequestForm(questionFields({ "items[0].species": "ignored", "items[0].quantity": "ignored" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestType).toBe("question");
      expect(result.data.items).toEqual([]);
      expect(result.data.notes).toBe("Do you have salmon this week?");
    }
  });

  it("requires notes for a question request", () => {
    const result = parseRequestForm(questionFields({ notes: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.notes).toBeTruthy();
  });

  it("requires contactName", () => {
    const result = parseRequestForm(fishFields({ contactName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.contactName).toBeTruthy();
  });

  it("rejects a malformed email but allows a blank one", () => {
    const bad = parseRequestForm(fishFields({ contactEmail: "not-an-email" }));
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.contactEmail).toBeTruthy();

    const blank = parseRequestForm(fishFields({ contactEmail: "" }));
    expect(blank.success).toBe(true);
  });

  it("enforces each field limit", () => {
    expect(parseRequestForm(fishFields({ "items[0].species": "x".repeat(FIELD_LIMITS.species + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ "items[0].quantity": "x".repeat(FIELD_LIMITS.quantity + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ "items[0].notes": "x".repeat(FIELD_LIMITS.itemNotes + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ notes: "x".repeat(FIELD_LIMITS.notes + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ contactName: "x".repeat(FIELD_LIMITS.contactName + 1) })).success).toBe(false);
    expect(parseRequestForm(fishFields({ contactPhone: "x".repeat(FIELD_LIMITS.contactPhone + 1) })).success).toBe(false);
  });
});

describe("parseMessageForm", () => {
  it("requires a body", () => {
    expect(parseMessageForm({ body: "" }).success).toBe(false);
    expect(parseMessageForm({ body: "Sounds good" }).success).toBe(true);
  });

  it("enforces the message body limit", () => {
    expect(parseMessageForm({ body: "x".repeat(FIELD_LIMITS.messageBody + 1) }).success).toBe(false);
  });
});

describe("parseStatusUpdate", () => {
  it("accepts each valid status", () => {
    for (const status of ["open", "confirmed", "fulfilled", "declined"]) {
      expect(parseStatusUpdate({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(parseStatusUpdate({ status: "paid" }).success).toBe(false);
  });
});

describe("parseItemResolutionForm (#106)", () => {
  const ids = ["item-a", "item-b"];

  function rows(overrides: Record<string, string> = {}) {
    return {
      "items[0].id": "item-a",
      "items[0].status": "available",
      "items[0].price": "24.50",
      "items[0].vendorNote": "",
      "items[1].id": "item-b",
      "items[1].status": "unavailable",
      "items[1].price": "",
      "items[1].vendorNote": "none this week",
      ...overrides,
    };
  }

  it("parses statuses, optional prices, and notes", () => {
    const result = parseItemResolutionForm(rows(), ids);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual([
      { id: "item-a", status: "available", priceCents: 2450, marketRate: false, vendorNote: null },
      { id: "item-b", status: "unavailable", priceCents: null, marketRate: false, vendorNote: "none this week" },
    ]);
  });

  it("reads the market-rate checkbox ('on' when ticked, absent otherwise)", () => {
    const result = parseItemResolutionForm(rows({ "items[0].marketRate": "on", "items[0].price": "" }), ids);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]).toMatchObject({ priceCents: null, marketRate: true });
    expect(result.data[1].marketRate).toBe(false);
  });

  it("rejects a non-numeric or non-positive price on the right row", () => {
    const bad = parseItemResolutionForm(rows({ "items[1].price": "abc" }), ids);
    expect(bad.success).toBe(false);
    if (bad.success) return;
    expect(bad.errors[resolutionFieldId(1, "price")]).toContain("number");

    const zero = parseItemResolutionForm(rows({ "items[0].price": "0" }), ids);
    expect(zero.success).toBe(false);
    if (zero.success) return;
    expect(zero.errors[resolutionFieldId(0, "price")]).toContain("greater than 0");

    // Finite but absurd — would blow the Int column, not a 500.
    const huge = parseItemResolutionForm(rows({ "items[0].price": "1e17" }), ids);
    expect(huge.success).toBe(false);
  });

  it("rejects an id that doesn't belong to the request", () => {
    const result = parseItemResolutionForm(rows({ "items[0].id": "someone-elses" }), ids);
    expect(result.success).toBe(false);
  });

  it("rejects a duplicated id", () => {
    const result = parseItemResolutionForm(rows({ "items[1].id": "item-a" }), ids);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = parseItemResolutionForm(rows({ "items[0].status": "sold" }), ids);
    expect(result.success).toBe(false);
  });

  it("caps the vendor note length", () => {
    const result = parseItemResolutionForm(
      rows({ "items[0].vendorNote": "x".repeat(FIELD_LIMITS.vendorNote + 1) }),
      ids,
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty submission", () => {
    expect(parseItemResolutionForm({}, ids).success).toBe(false);
  });
});
