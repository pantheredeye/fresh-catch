import { describe, expect, it } from "vitest";
import { MarketRow } from "./components";
import type { Market } from "@/lib/db";

describe("MarketRow", () => {
  it("renders the schedule in its own element", () => {
    const market = { id: "m1", name: "Dock", schedule: "Fridays 10 - 6", type: "regular" } as Market;
    const html = String(<MarketRow market={market} status="active" />);
    expect(html).toContain('<span class="market-schedule">Fridays 10\u2060-\u20606</span>');
    expect(html).not.toContain(" — ");
  });
});
