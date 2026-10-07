import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { BackLink } from "@/ui/back-link";
import { listRequestableCatchItems, type RequestableCatchItem } from "@/features/catch/queries";
import { getVendor } from "@/features/vendor/queries";
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
import { MAX_REQUEST_ITEMS, parseMessageForm, parseRequestForm, rawItemRows } from "./validation";
import {
  MessageForm,
  RequestConfirmation,
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
    items: rawItemRows(raw).map(({ row }) => ({
      species: row.species || undefined,
      speciesOther: row.speciesOther || undefined,
      quantity: row.quantity || undefined,
      notes: row.notes || undefined,
    })),
    notes: formString(raw.notes),
    contactName: formString(raw.contactName),
    contactEmail: formString(raw.contactEmail),
    contactPhone: formString(raw.contactPhone),
  };
}

type BuilderAction = { kind: "add" } | { kind: "remove"; index: number };

/** The builder's no-JS "Add another fish" / per-row "Remove" submit buttons (issue 103). */
function builderAction(raw: Record<string, unknown>): BuilderAction | null {
  if (raw.action === "add-row") return { kind: "add" };
  const match = typeof raw.action === "string" ? raw.action.match(/^remove-(\d+)$/) : null;
  return match ? { kind: "remove", index: Number(match[1]) } : null;
}

function applyBuilderAction(
  values: RequestFormValues,
  action: BuilderAction,
): { values: RequestFormValues; autofocusItem?: number } {
  const items = values.items?.length ? [...values.items] : [{}];
  if (action.kind === "add") {
    if (items.length < MAX_REQUEST_ITEMS) items.push({});
    return { values: { ...values, items }, autofocusItem: items.length - 1 };
  }
  if (items.length > 1 && action.index >= 0 && action.index < items.length) items.splice(action.index, 1);
  return { values: { ...values, items } };
}

async function renderBuilderPage(
  c: AppContext,
  values: RequestFormValues,
  errors: Record<string, string>,
  status: 200 | 400,
  options: { autofocusItem?: number; catchItems?: RequestableCatchItem[] } = {},
) {
  const { autofocusItem } = options;
  const [csrfToken, vendor, catchItems] = await Promise.all([
    csrfTokenFor(c),
    getVendor(),
    // The submit path already fetched the live catch for isCustom — reuse it.
    options.catchItems ?? listRequestableCatchItems(),
  ]);
  return c.html(
    <Document title="New request — 2 Fishes Seafood" deviceToken={c.var.deviceToken}>
      <BrandBar vendor={vendor} />
      <Page>
        <BackLink href="/">Back to 2 Fishes Seafood</BackLink>
        <h1>New request</h1>
        <RequestForm
          action="/requests"
          csrfToken={csrfToken}
          values={values}
          errors={errors}
          catchItems={catchItems}
          autofocusItem={autofocusItem}
        />
      </Page>
      <Footer vendor={vendor} session={c.var.session} />
    </Document>,
    status,
  );
}

/**
 * Registered before `/requests/:id` below — Hono matches routes in
 * registration order, and this static path would otherwise be swallowed as
 * `id: "new"` (same gotcha `/markets/past` documents).
 */
requestRoutes.get("/requests/new", async (c) => {
  const type = c.req.query("type") === "question" ? "question" : "fish";
  const species = c.req.query("species");
  const values: RequestFormValues = {
    requestType: type,
    items: [{ species: species ?? undefined }],
    contactEmail: c.var.session?.email,
  };
  return renderBuilderPage(c, values, {}, 200);
});

requestRoutes.post("/requests", csrfProtect(), async (c) => {
  const body = await c.req.parseBody();

  // Add/remove-row round trips only re-render the form — handled before the
  // requestCreate limiter so growing an order never burns submit budget
  // (issue 103), but on their own loose bucket so the render isn't unmetered.
  const action = builderAction(body);
  if (action) {
    const rl = await checkRateLimit(clientIp(c.req.raw), "builderAction", c.var.deviceToken);
    if (!rl.allowed) return c.text("Too many requests. Try again later.", 429);
    const { values, autofocusItem } = applyBuilderAction(rawToFormValues(body), action);
    return renderBuilderPage(c, values, {}, 200, { autofocusItem });
  }

  const rl = await checkRateLimit(clientIp(c.req.raw), "requestCreate", c.var.deviceToken);
  if (!rl.allowed) return c.text("Too many requests. Try again later.", 429);

  const liveItems = await listRequestableCatchItems();
  const result = parseRequestForm(body, { liveSpecies: liveItems.map((item) => item.name) });

  if (!result.success) {
    return renderBuilderPage(c, rawToFormValues(body), result.errors, 400, { catchItems: liveItems });
  }

  const request = await createRequest(result.data, {
    deviceToken: c.var.deviceToken,
    userId: c.var.session?.userId ?? null,
  });
  runInBackground(c, notifyVendorOfNewRequest(c.env, request));
  return c.redirect(`/requests/${request.id}?created=1`);
});

requestRoutes.get("/requests", async (c) => {
  const [requests, vendor] = await Promise.all([
    listRequestsForViewer({
      deviceToken: c.var.deviceToken,
      userId: c.var.session?.userId ?? null,
    }),
    getVendor(),
  ]);
  return c.html(
    <Document title="My requests — 2 Fishes Seafood" deviceToken={c.var.deviceToken}>
      <BrandBar vendor={vendor} />
      <Page>
        <BackLink href="/">Back to 2 Fishes Seafood</BackLink>
        <h1>My requests</h1>
        {requests.length === 0 ? <p class="muted">No requests yet.</p> : null}
        <div class="stack">
          {requests.map((request) => (
            <RequestListRow request={request} />
          ))}
        </div>
      </Page>
      <Footer vendor={vendor} session={c.var.session} />
    </Document>,
  );
});

requestRoutes.get("/requests/:id", async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  // R2: 404, not 403 — a bare unguessable id in the URL must not confirm a thread exists.
  if (!request || !canViewRequest(request, viewerFor(c))) return c.text("Not found", 404);

  const [csrfToken, vendor] = await Promise.all([csrfTokenFor(c), getVendor()]);
  // Where Stripe Checkout returns the customer (#60). Purely a message —
  // the order card's paid state comes from the webhook, not this param.
  const checkout = c.req.query("checkout");
  // Set by the POST /requests redirect right after creation (handoff §3:
  // same verb through the flow — "Request bass" → "Requested").
  const created = c.req.query("created") === "1";
  return c.html(
    <Document title={`${requestTitle(request)} — 2 Fishes Seafood`} deviceToken={c.var.deviceToken}>
      <BrandBar vendor={vendor} />
      <Page>
        <BackLink href="/requests">My requests</BackLink>
        {created ? (
          <RequestConfirmation
            requestType={request.requestType}
            hasCustomItems={request.items.some((item) => item.isCustom)}
          />
        ) : null}
        {checkout === "success" || checkout === "cancel" ? <CheckoutNotice outcome={checkout} /> : null}
        <RequestHeaderCard request={request} />
        {request.order ? <OrderSummaryCard order={request.order} /> : null}
        <Thread messages={request.messages} viewer="customer" customerName={request.contactName} />
        <MessageForm action={`/requests/${request.id}/messages`} csrfToken={csrfToken} />
      </Page>
      <Footer vendor={vendor} session={c.var.session} />
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
    const [withMessages, csrfToken, vendor] = await Promise.all([
      getRequestWithMessages(request.id),
      csrfTokenFor(c),
      getVendor(),
    ]);
    return c.html(
      <Document title={`${requestTitle(request)} — 2 Fishes Seafood`} deviceToken={c.var.deviceToken}>
        <BrandBar vendor={vendor} />
        <Page>
          <BackLink href="/requests">My requests</BackLink>
          <RequestHeaderCard request={request} />
          <Thread messages={withMessages?.messages ?? []} viewer="customer" customerName={request.contactName} />
          <MessageForm
            action={`/requests/${request.id}/messages`}
            csrfToken={csrfToken}
            errorText={result.errors.body}
          />
        </Page>
        <Footer vendor={vendor} session={c.var.session} />
      </Document>,
      400,
    );
  }

  await appendMessage(request.id, "customer", result.data.body);
  runInBackground(c, notifyVendorOfCustomerReply(c.env, request));
  return c.redirect(`/requests/${request.id}`);
});
