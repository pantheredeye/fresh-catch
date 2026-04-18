import { describe, expect, it } from "vitest";
import { vitestInvoke } from "rwsdk-community/test";

type QuickAction = { icon: string; title: string; href: string };

describe("getQuickActions", () => {
  it("first action is Order with default href", async () => {
    const actions = await vitestInvoke<QuickAction[]>("getQuickActions");
    expect(actions[0]).toEqual({
      icon: "🐟",
      title: "Order",
      href: "/orders/new",
    });
  });

  it("embeds vendor slug in href when provided", async () => {
    const actions = await vitestInvoke<QuickAction[]>(
      "getQuickActions",
      "acme-fish",
    );
    expect(actions[0].href).toBe("/orders/new?b=acme-fish");
  });

  it("returns four actions in stable order", async () => {
    const actions = await vitestInvoke<QuickAction[]>("getQuickActions");
    expect(actions.map((a) => a.title)).toEqual([
      "Order",
      "My Orders",
      "Markets",
      "Contact",
    ]);
  });
});
