import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupDb, db } from "@/lib/db";
import type { Bindings } from "@/types";
import * as emailLib from "@/lib/email";
import { notifyCustomerOfVendorReply, notifyVendorOfCustomerReply, notifyVendorOfNewRequest } from "./notifications";
import { createRequest } from "./queries";

const sendEmailMock = vi.spyOn(emailLib, "sendEmail");
const bindings = env as unknown as Bindings;

beforeEach(async () => {
  await setupDb(bindings);
  await db.vendor.deleteMany();
  sendEmailMock.mockClear();
});

function fishInput(overrides: Partial<Parameters<typeof createRequest>[0]> = {}): Parameters<typeof createRequest>[0] {
  return {
    requestType: "fish" as const,
    items: [{ species: "Halibut", quantity: "2 lbs", notes: null, isCustom: false }],
    notes: null,
    contactName: "Jamie",
    contactEmail: "jamie@example.com",
    contactPhone: null,
    ...overrides,
  };
}

describe("notifyVendorOfNewRequest / notifyVendorOfCustomerReply", () => {
  it("emails every ADMIN_EMAILS entry when no Vendor.notificationEmail is set", async () => {
    const multi = { ...bindings, ADMIN_EMAILS: "a@x.com, b@x.com,," };
    const request = await createRequest(fishInput(), { deviceToken: "d1", userId: null });
    await notifyVendorOfNewRequest(multi, request);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [, message] = sendEmailMock.mock.calls[0];
    expect(message.to).toEqual(["a@x.com", "b@x.com"]);
    expect(message.subject).toContain("Halibut");
    expect(message.html).toContain(`${bindings.APP_URL}/admin/requests/${request.id}`);
  });

  it("lists every item one per line, escaped, with a +N subject (issue 105)", async () => {
    const request = await createRequest(
      fishInput({
        items: [
          { species: "Halibut", quantity: "2 lbs", notes: null, isCustom: false },
          { species: "King <Salmon>", quantity: "1 whole", notes: "filleted", isCustom: false },
          { species: "Wahoo", quantity: null, notes: null, isCustom: true },
        ],
      }),
      { deviceToken: "d5", userId: null },
    );
    await notifyVendorOfNewRequest(bindings, request);

    const [, message] = sendEmailMock.mock.calls[0];
    expect(message.subject).toBe("New request: Halibut +2");
    expect(message.html).toContain("Halibut — 2 lbs");
    expect(message.html).toContain("King &lt;Salmon&gt; — 1 whole (filleted)");
    expect(message.html).toContain("Wahoo · not on list");
    expect(message.html).not.toContain("<Salmon>");
  });

  it("adds Vendor.notificationEmail to the ADMIN_EMAILS recipients", async () => {
    const multi = { ...bindings, ADMIN_EMAILS: "a@x.com,b@x.com" };
    await db.vendor.create({ data: { id: "evan", name: "Evan", notificationEmail: "evan@example.com" } });
    const request = await createRequest(fishInput(), { deviceToken: "d2", userId: null });
    await notifyVendorOfCustomerReply(multi, request);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toEqual(["evan@example.com", "a@x.com", "b@x.com"]);
    expect(sendEmailMock.mock.calls[0][1].subject).toContain("reply");
  });

  it("dedupes notificationEmail against admins case-insensitively", async () => {
    const multi = { ...bindings, ADMIN_EMAILS: "a@x.com,b@x.com" };
    await db.vendor.create({ data: { id: "evan", name: "Evan", notificationEmail: "A@X.com" } });
    const request = await createRequest(fishInput(), { deviceToken: "d7", userId: null });
    await notifyVendorOfNewRequest(multi, request);

    expect(sendEmailMock.mock.calls[0][1].to).toEqual(["A@X.com", "b@x.com"]);
  });

  it("skips silently when there are no recipients", async () => {
    const none = { ...bindings, ADMIN_EMAILS: "" };
    const request = await createRequest(fishInput(), { deviceToken: "d8", userId: null });
    await notifyVendorOfNewRequest(none, request);
    await notifyVendorOfCustomerReply(none, request);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("notifyCustomerOfVendorReply", () => {
  it("emails the request's contactEmail with a customer-facing deep link", async () => {
    const request = await createRequest(fishInput({ contactEmail: "customer@example.com" }), {
      deviceToken: "d3",
      userId: null,
    });
    await notifyCustomerOfVendorReply(bindings, request);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [, message] = sendEmailMock.mock.calls[0];
    expect(message.to).toBe("customer@example.com");
    // #131: the secret link opens the thread from any device.
    expect(message.html).toContain(`${bindings.APP_URL}/requests/${request.id}?t=${request.accessToken}`);
  });

  it("never puts the customer's access token in Evan's alerts", async () => {
    const request = await createRequest(fishInput(), { deviceToken: "d6", userId: null });
    await notifyVendorOfNewRequest(bindings, request);
    await notifyVendorOfCustomerReply(bindings, request);
    for (const [, message] of sendEmailMock.mock.calls) expect(message.html).not.toContain(request.accessToken);
  });

  it("skips silently when the request has no contactEmail", async () => {
    const request = await createRequest(fishInput({ contactEmail: null }), { deviceToken: "d4", userId: null });
    await notifyCustomerOfVendorReply(bindings, request);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
