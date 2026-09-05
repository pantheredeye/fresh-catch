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
  sendEmailMock.mockClear();
});

function fishInput(overrides: Partial<Parameters<typeof createRequest>[0]> = {}) {
  return {
    requestType: "fish" as const,
    species: "Halibut",
    quantity: "2 lbs",
    notes: null,
    contactName: "Jamie",
    contactEmail: "jamie@example.com",
    contactPhone: null,
    ...overrides,
  };
}

describe("notifyVendorOfNewRequest / notifyVendorOfCustomerReply", () => {
  it("emails the first ADMIN_EMAILS entry when no Vendor.notificationEmail is set", async () => {
    const request = await createRequest(fishInput(), { deviceToken: "d1", userId: null });
    await notifyVendorOfNewRequest(bindings, request);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [, message] = sendEmailMock.mock.calls[0];
    expect(message.to).toBe(bindings.ADMIN_EMAILS.split(",")[0].trim());
    expect(message.subject).toContain("Halibut");
    expect(message.html).toContain(`${bindings.APP_URL}/admin/requests/${request.id}`);
  });

  it("prefers Vendor.notificationEmail over the ADMIN_EMAILS fallback", async () => {
    await db.vendor.create({ data: { id: "evan", name: "Evan", notificationEmail: "evan@example.com" } });
    const request = await createRequest(fishInput(), { deviceToken: "d2", userId: null });
    await notifyVendorOfCustomerReply(bindings, request);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][1].to).toBe("evan@example.com");
    expect(sendEmailMock.mock.calls[0][1].subject).toContain("reply");
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
    expect(message.html).toContain(`${bindings.APP_URL}/requests/${request.id}`);
  });

  it("skips silently when the request has no contactEmail", async () => {
    const request = await createRequest(fishInput({ contactEmail: null }), { deviceToken: "d4", userId: null });
    await notifyCustomerOfVendorReply(bindings, request);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
