import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { SiteNav } from "@/ui/site-nav";
import { requireSecret } from "@/lib/env";
import { runInBackground } from "@/lib/background";
import { csrfProtect } from "@/features/auth/middleware";
import { createDeviceCsrfToken } from "@/features/auth/csrf";
import { checkRateLimit } from "@/features/auth/rate-limit";
import {
  appendMessage,
  canViewRequest,
  createRequest,
  getRequest,
  getRequestWithMessages,
  listRequestsForViewer,
} from "./queries";
import { notifyVendorOfCustomerReply, notifyVendorOfNewRequest } from "./notifications";
import { parseMessageForm, parseRequestForm } from "./validation";
import {
  MessageForm,
  RequestForm,
  RequestHeaderCard,
  RequestListRow,
  Thread,
  requestTitle,
  type RequestFormValues,
} from "./components";
import { OrderSummaryCard } from "@/features/orders/components";
import { CheckoutNotice } from "@/features/payments/components";

export const requestRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "unknown";
}

/** R4: session csrfToken when logged in, else the device-token HMAC — same shape either way to the form. */
async function csrfTokenFor(c: AppContext): Promise<string> {
  const session = c.var.session;
  if (session) return session.csrfToken;
  return createDeviceCsrfToken(c.var.deviceToken, requireSecret(c.env, "SESSION_SECRET"));
}

function viewerFor(c: AppContext) {
  const session = c.var.session;
  return { deviceToken: c.var.deviceToken, userId: session?.userId ?? null, isAdmin: session?.isAdmin ?? false };
}

function formString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function rawToFormValues(raw: Record<string, unknown>): RequestFormValues {
  return {
    requestType: formString(raw.requestType),
    species: formString(raw.species),
    quantity: formString(raw.quantity),
    notes: formString(raw.notes),
    contactName: formString(raw.contactName),
    contactEmail: formString(raw.contactEmail),
    contactPhone: formString(raw.contactPhone),
  };
}

/**
 * Registered before `/requests/:id` below — Hono matches routes in
 * registration order, and this static path would otherwise be swallowed as
 * `id: "new"` (same gotcha `/markets/past` documents).
 */
requestRoutes.get("/requests/new", async (c) => {
  const type = c.req.query("type") === "question" ? "question" : "fish";
  const species = c.req.query("species");
  const csrfToken = await csrfTokenFor(c);
  const values: RequestFormValues = {
    requestType: type,
    species: species ?? undefined,
    contactEmail: c.var.session?.email,
  };
  return c.html(
    <Document title="New request — Fresh Catch" deviceToken={c.var.deviceToken}>
      <SiteNav session={c.var.session} />
      <Page>
        <p>
          <a href="/">← Back to Fresh Catch</a>
        </p>
        <h1>New request</h1>
        <RequestForm action="/requests" csrfToken={csrfToken} values={values} />
      </Page>
    </Document>,
  );
});

requestRoutes.post("/requests", csrfProtect(), async (c) => {
  const rl = await checkRateLimit(clientIp(c.req.raw), "requestCreate", c.var.deviceToken);
  if (!rl.allowed) return c.text("Too many requests. Try again later.", 429);

  const body = await c.req.parseBody();
  const result = parseRequestForm(body);

  if (!result.success) {
    const csrfToken = await csrfTokenFor(c);
    return c.html(
      <Document title="New request — Fresh Catch" deviceToken={c.var.deviceToken}>
        <SiteNav session={c.var.session} />
        <Page>
          <h1>New request</h1>
          <RequestForm action="/requests" csrfToken={csrfToken} values={rawToFormValues(body)} errors={result.errors} />
        </Page>
      </Document>,
      400,
    );
  }

  const request = await createRequest(result.data, {
    deviceToken: c.var.deviceToken,
    userId: c.var.session?.userId ?? null,
  });
  runInBackground(c, notifyVendorOfNewRequest(c.env, request));
  return c.redirect(`/requests/${request.id}`);
});

requestRoutes.get("/requests", async (c) => {
  const requests = await listRequestsForViewer({
    deviceToken: c.var.deviceToken,
    userId: c.var.session?.userId ?? null,
  });
  return c.html(
    <Document title="My requests — Fresh Catch" deviceToken={c.var.deviceToken}>
      <SiteNav session={c.var.session} />
      <Page>
        <p>
          <a href="/">← Back to Fresh Catch</a>
        </p>
        <h1>My requests</h1>
        {requests.length === 0 ? <p>No requests yet.</p> : null}
        <div class="stack">
          {requests.map((request) => (
            <RequestListRow request={request} />
          ))}
        </div>
      </Page>
    </Document>,
  );
});

requestRoutes.get("/requests/:id", async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  // R2: 404, not 403 — a bare unguessable id in the URL must not confirm a thread exists.
  if (!request || !canViewRequest(request, viewerFor(c))) return c.text("Not found", 404);

  const csrfToken = await csrfTokenFor(c);
  // Where Stripe Checkout returns the customer (#60). Purely a message —
  // the order card's paid state comes from the webhook, not this param.
  const checkout = c.req.query("checkout");
  return c.html(
    <Document title={`${requestTitle(request)} — Fresh Catch`} deviceToken={c.var.deviceToken}>
      <SiteNav session={c.var.session} />
      <Page>
        <p>
          <a href="/requests">← My requests</a>
        </p>
        {checkout === "success" || checkout === "cancel" ? <CheckoutNotice outcome={checkout} /> : null}
        <RequestHeaderCard request={request} />
        {request.order ? <OrderSummaryCard order={request.order} /> : null}
        <Thread messages={request.messages} viewer="customer" customerName={request.contactName} />
        <MessageForm action={`/requests/${request.id}/messages`} csrfToken={csrfToken} />
      </Page>
    </Document>,
  );
});

requestRoutes.post("/requests/:id/messages", csrfProtect(), async (c) => {
  const request = await getRequest(c.req.param("id"));
  if (!request || !canViewRequest(request, viewerFor(c))) return c.text("Not found", 404);

  const rl = await checkRateLimit(clientIp(c.req.raw), "messageCreate", c.var.deviceToken);
  if (!rl.allowed) return c.text("Too many messages. Try again later.", 429);

  const body = await c.req.parseBody();
  const result = parseMessageForm(body);

  if (!result.success) {
    const withMessages = await getRequestWithMessages(request.id);
    const csrfToken = await csrfTokenFor(c);
    return c.html(
      <Document title={`${requestTitle(request)} — Fresh Catch`} deviceToken={c.var.deviceToken}>
        <SiteNav session={c.var.session} />
        <Page>
          <RequestHeaderCard request={request} />
          <Thread messages={withMessages?.messages ?? []} viewer="customer" customerName={request.contactName} />
          <MessageForm
            action={`/requests/${request.id}/messages`}
            csrfToken={csrfToken}
            errorText={result.errors.body}
          />
        </Page>
      </Document>,
      400,
    );
  }

  await appendMessage(request.id, "customer", result.data.body);
  runInBackground(c, notifyVendorOfCustomerReply(c.env, request));
  return c.redirect(`/requests/${request.id}`);
});
