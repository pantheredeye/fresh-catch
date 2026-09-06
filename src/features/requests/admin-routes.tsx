import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { runInBackground } from "@/lib/background";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import {
  appendMessage,
  createRequest,
  getRequest,
  getRequestWithMessages,
  listInbox,
  setRequestStatus,
  type InboxFilter,
} from "./queries";
import { notifyCustomerOfVendorReply } from "./notifications";
import { parseMessageForm, parseRequestForm, parseStatusUpdate } from "./validation";
import { AdminReplyForm, InboxRow, RequestForm, RequestHeaderCard, StatusForm, Thread, requestTitle } from "./components";
import { rawToFormValues } from "./routes";
import { ConfirmOrderForm, MarkPaidForm, OrderSummaryCard, formatCents } from "@/features/orders/components";
import { confirmOrderForRequest, recordPayment } from "@/features/orders/queries";
import { parseConfirmOrderForm, parseMarkPaidForm } from "@/features/orders/validation";
import { resolveStripeConfig } from "@/features/payments/config";
import { checkoutAmountFor, createCheckoutForOrder } from "@/features/payments/checkout";
import { RequestPaymentForm } from "@/features/payments/components";

export const requestsAdminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

requestsAdminRoutes.use("/admin/requests", requireAdmin());
requestsAdminRoutes.use("/admin/requests/*", requireAdmin());

function inboxFilterFrom(query: string | undefined): InboxFilter {
  if (query === "all") return "all";
  if (query === "archive") return "archive";
  return "active";
}

const FILTER_LABEL: Record<InboxFilter, string> = {
  active: "Open + confirmed",
  all: "All",
  archive: "Archive",
};

requestsAdminRoutes.get("/admin/requests", async (c) => {
  const filter = inboxFilterFrom(c.req.query("status"));
  const entries = await listInbox(filter);

  return c.html(
    <Document title="Requests — Admin">
      <main class="page stack">
        <h1>Requests</h1>
        <nav style="display: flex; gap: 12px;">
          <a href="/admin/requests" aria-current={filter === "active" ? "page" : undefined}>
            {FILTER_LABEL.active}
          </a>
          <a href="/admin/requests?status=all" aria-current={filter === "all" ? "page" : undefined}>
            {FILTER_LABEL.all}
          </a>
          <a href="/admin/requests?status=archive" aria-current={filter === "archive" ? "page" : undefined}>
            {FILTER_LABEL.archive}
          </a>
          <a href="/admin/requests/new">New request</a>
        </nav>
        <div class="stack">
          {entries.length === 0 ? <p>No requests here.</p> : null}
          {entries.map((entry) => (
            <InboxRow entry={entry} />
          ))}
        </div>
      </main>
    </Document>,
  );
});

/**
 * Registered before `/admin/requests/:id` below — same static-before-param
 * ordering gotcha as `/requests/new` in routes.tsx.
 */
requestsAdminRoutes.get("/admin/requests/new", async (c) => {
  const csrfToken = c.var.session!.csrfToken;
  return c.html(
    <Document title="New request — Admin">
      <main class="page stack">
        <p>
          <a href="/admin/requests">← Requests</a>
        </p>
        <h1>New request</h1>
        <RequestForm action="/admin/requests" csrfToken={csrfToken} />
      </main>
    </Document>,
  );
});

/**
 * Vendor-initiated request (#64) — the second entry point into #59's
 * machinery. Evan creates a `FishRequest` on a customer's behalf (e.g. a
 * walk-up at the market): no device token, `origin: "vendor"`, born
 * `status: "confirmed"`, and its opening message is `sender: "vendor"` —
 * which is itself a "vendor reply" from the customer's point of view, so it
 * gets the same customer-facing email as any other admin reply.
 */
requestsAdminRoutes.post("/admin/requests", csrfProtect(), async (c) => {
  const body = await c.req.parseBody();
  const result = parseRequestForm(body);

  if (!result.success) {
    return c.html(
      <Document title="New request — Admin">
        <main class="page stack">
          <h1>New request</h1>
          <RequestForm
            action="/admin/requests"
            csrfToken={c.var.session!.csrfToken}
            values={rawToFormValues(body)}
            errors={result.errors}
          />
        </main>
      </Document>,
      400,
    );
  }

  const request = await createRequest(
    result.data,
    { deviceToken: null, userId: null },
    { origin: "vendor", status: "confirmed" },
  );
  runInBackground(c, notifyCustomerOfVendorReply(c.env, request));
  return c.redirect(`/admin/requests/${request.id}`);
});

requestsAdminRoutes.get("/admin/requests/:id", async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  if (!request) return c.text("Not found", 404);
  const csrfToken = c.var.session!.csrfToken;
  // Stripe (#60) is optional: unconfigured, this resolves to null and the
  // "Request payment" action simply isn't offered. Nothing else changes.
  const stripeConfig = request.order && !request.order.paidAt ? await resolveStripeConfig(c.env) : null;
  const dueNow = stripeConfig ? checkoutAmountFor(request.order!, stripeConfig.platformFeeBps) : null;

  return c.html(
    <Document title={`${requestTitle(request)} — Admin`}>
      <main class="page stack">
        <p>
          <a href="/admin/requests">← Requests</a>
        </p>
        <RequestHeaderCard request={request} />
        {request.order ? (
          <OrderSummaryCard order={request.order} />
        ) : (
          <ConfirmOrderForm action={`/admin/requests/${request.id}/confirm-order`} csrfToken={csrfToken} />
        )}
        {dueNow ? (
          <RequestPaymentForm
            action={`/admin/requests/${request.id}/request-payment`}
            csrfToken={csrfToken}
            amountCents={dueNow.chargeCents}
            isDeposit={dueNow.isDeposit}
          />
        ) : null}
        {request.order && !request.order.paidAt ? (
          <MarkPaidForm action={`/admin/requests/${request.id}/mark-paid`} csrfToken={csrfToken} />
        ) : null}
        <Thread messages={request.messages} viewer="admin" customerName={request.contactName} />
        <AdminReplyForm
          action={`/admin/requests/${request.id}/messages`}
          csrfToken={csrfToken}
          currentStatus={request.status}
        />
        <StatusForm action={`/admin/requests/${request.id}/status`} csrfToken={csrfToken} currentStatus={request.status} />
      </main>
    </Document>,
  );
});

/** Issue #65: price (dollars → cents) + optional deposit → linked Order, request confirmed, quote posted as a vendor message. */
requestsAdminRoutes.post("/admin/requests/:id/confirm-order", csrfProtect(), async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  if (!request) return c.text("Not found", 404);
  // One order per thread — the unique index on Order.requestId is the backstop, this is the friendly path.
  if (request.order) return c.text("Order already confirmed", 400);

  const body = await c.req.parseBody();
  const result = parseConfirmOrderForm(body);

  if (!result.success) {
    return c.html(
      <Document title={`${requestTitle(request)} — Admin`}>
        <main class="page stack">
          <RequestHeaderCard request={request} />
          <ConfirmOrderForm
            action={`/admin/requests/${request.id}/confirm-order`}
            csrfToken={c.var.session!.csrfToken}
            errors={result.errors}
          />
          <Thread messages={request.messages} viewer="admin" customerName={request.contactName} />
        </main>
      </Document>,
      400,
    );
  }

  const order = await confirmOrderForRequest(request, result.data);
  const quoteBody =
    `Quoted ${formatCents(order.price!)} for this order.` +
    (order.depositAmount != null ? ` Deposit of ${formatCents(order.depositAmount)} requested.` : "");
  await appendMessage(request.id, "vendor", quoteBody);
  runInBackground(c, notifyCustomerOfVendorReply(c.env, request));

  return c.redirect(`/admin/requests/${request.id}`);
});

/**
 * Issue #60: mint a Stripe Checkout link for what's outstanding and post it
 * into the thread as a vendor message. A plain URL in a message is shareable
 * by construction — Evan can text or read it out for a walk-up customer,
 * which is exactly the vendor-initiated case from the issue's addendum.
 */
requestsAdminRoutes.post("/admin/requests/:id/request-payment", csrfProtect(), async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  if (!request) return c.text("Not found", 404);
  if (!request.order) return c.text("Confirm an order before requesting payment", 400);

  const config = await resolveStripeConfig(c.env);
  if (!config) return c.text("Stripe is not configured — settle this one in person", 400);

  const result = await createCheckoutForOrder(c.env, config, request.order, request.id);
  if (!result.ok) {
    const message =
      result.reason === "nothing-due"
        ? "Nothing left to charge on this order"
        : result.reason === "below-minimum"
          ? "Stripe won't take a charge under $0.50 — settle this one in person"
          : "Could not create a payment link — check the Stripe configuration and try again";
    return c.text(message, result.reason === "stripe-error" || result.reason === "no-url" ? 502 : 400);
  }

  await appendMessage(request.id, "vendor", `Pay by card here: ${result.url}`);
  runInBackground(c, notifyCustomerOfVendorReply(c.env, request));

  return c.redirect(`/admin/requests/${request.id}`);
});

/** Mark-paid-in-person (issue #65) — no Stripe. Records a Payment ledger row and bumps the order's amountPaid. */
requestsAdminRoutes.post("/admin/requests/:id/mark-paid", csrfProtect(), async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  if (!request) return c.text("Not found", 404);
  if (!request.order) return c.text("No order to pay", 400);

  const body = await c.req.parseBody();
  const result = parseMarkPaidForm(body);

  if (!result.success) {
    return c.html(
      <Document title={`${requestTitle(request)} — Admin`}>
        <main class="page stack">
          <RequestHeaderCard request={request} />
          <OrderSummaryCard order={request.order} />
          <MarkPaidForm
            action={`/admin/requests/${request.id}/mark-paid`}
            csrfToken={c.var.session!.csrfToken}
            errors={result.errors}
          />
          <Thread messages={request.messages} viewer="admin" customerName={request.contactName} />
        </main>
      </Document>,
      400,
    );
  }

  await recordPayment(request.order, result.data);
  return c.redirect(`/admin/requests/${request.id}`);
});

requestsAdminRoutes.post("/admin/requests/:id/messages", csrfProtect(), async (c) => {
  const request = await getRequest(c.req.param("id"));
  if (!request) return c.text("Not found", 404);

  const body = await c.req.parseBody();
  const result = parseMessageForm(body);

  if (!result.success) {
    const withMessages = await getRequestWithMessages(request.id);
    return c.html(
      <Document title={`${requestTitle(request)} — Admin`}>
        <main class="page stack">
          <RequestHeaderCard request={request} />
          <Thread messages={withMessages?.messages ?? []} viewer="admin" customerName={request.contactName} />
          <AdminReplyForm
            action={`/admin/requests/${request.id}/messages`}
            csrfToken={c.var.session!.csrfToken}
            currentStatus={request.status}
            errorText={result.errors.body}
          />
        </main>
      </Document>,
      400,
    );
  }

  await appendMessage(request.id, "vendor", result.data.body);
  runInBackground(c, notifyCustomerOfVendorReply(c.env, request));

  const statusField = typeof body.status === "string" ? body.status : undefined;
  if (statusField) {
    const statusResult = parseStatusUpdate({ status: statusField });
    if (statusResult.success) await setRequestStatus(request.id, statusResult.data.status);
  }

  return c.redirect(`/admin/requests/${request.id}`);
});

requestsAdminRoutes.post("/admin/requests/:id/status", csrfProtect(), async (c) => {
  const request = await getRequest(c.req.param("id"));
  if (!request) return c.text("Not found", 404);

  const body = await c.req.parseBody();
  const result = parseStatusUpdate(body);
  if (!result.success) return c.text("Invalid status", 400);

  await setRequestStatus(request.id, result.data.status);
  return c.redirect(`/admin/requests/${request.id}`);
});
