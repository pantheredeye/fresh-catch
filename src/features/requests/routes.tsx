import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { BrandBar } from "@/ui/brand-bar";
import { Footer } from "@/ui/footer";
import { BackLink } from "@/ui/back-link";
import { Button } from "@/ui/button";
import { listRequestableCatchItems, type RequestableCatchItem } from "@/features/catch/queries";
import { getVendor } from "@/features/vendor/queries";
import { getMarket } from "@/features/markets/queries";
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
    // Cap what a re-render reflects — a crafted POST with thousands of
    // items[N].* fields must not echo a fieldset per row.
    items: rawItemRows(raw)
      .slice(0, MAX_REQUEST_ITEMS)
      .map(({ row }) => ({
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

/** The builder's no-JS "Add another fish" / per-row "Remove" submit buttons (issue 103). Shared with the admin walk-up form (issue 105). */
export function builderAction(raw: Record<string, unknown>): BuilderAction | null {
  if (raw.action === "add-row") return { kind: "add" };
  const match = typeof raw.action === "string" ? raw.action.match(/^remove-(\d+)$/) : null;
  return match ? { kind: "remove", index: Number(match[1]) } : null;
}

export function applyBuilderAction(
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
  const isQuestion = values.requestType === "question";
  const heading = isQuestion ? "Ask a question" : "Request an order";
  return c.html(
    <Document title={`${heading} — 2 Fishes Seafood`} deviceToken={c.var.deviceToken}>
      <BrandBar vendor={vendor} session={c.var.session} />
      <Page>
        <BackLink href="/">Back to 2 Fishes Seafood</BackLink>
        <h1>{heading}</h1>
        <p class="muted">
          {isQuestion ? (
            <>Want fish instead? <a href="/order">Request an order</a></>
          ) : (
            <>Just have a question? <a href="/ask">Ask us</a></>
          )}
        </p>
        <RequestForm
          action="/requests"
          csrfToken={csrfToken}
          values={values}
          errors={errors}
          catchItems={catchItems}
          autofocusItem={autofocusItem}
        />
      </Page>
      <Footer />
    </Document>,
    status,
  );
}

requestRoutes.get("/order", async (c) => {
  const species = c.req.query("species");
  const values: RequestFormValues = {
    requestType: "fish",
    items: [{ species: species ?? undefined }],
    contactEmail: c.var.session?.email,
  };
  return renderBuilderPage(c, values, {}, 200);
});

requestRoutes.get("/ask", async (c) => {
  const species = c.req.query("species");
  const marketId = c.req.query("market");
  const market = !species && marketId ? await getMarket(marketId) : null;
  const subject = species ?? market?.name;
  const values: RequestFormValues = {
    requestType: "question",
    // Pre-seeded from a fish row's or market page's "Ask" link so the question has its subject.
    notes: subject ? `About ${subject}: ` : undefined,
    contactEmail: c.var.session?.email,
  };
  return renderBuilderPage(c, values, {}, 200);
});

/** Legacy URL (bookmarks, old emails) — forwards to the split pages. */
requestRoutes.get("/requests/new", (c) => {
  const species = c.req.query("species");
  const query = species ? `?species=${encodeURIComponent(species)}` : "";
  return c.redirect(`${c.req.query("type") === "question" ? "/ask" : "/order"}${query}`, 301);
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
  const session = c.var.session;
  const claimedParam = c.req.query("claimed") ?? "";
  const claimedCount = /^[1-9]\d{0,5}$/.test(claimedParam) ? Number(claimedParam) : 0;
  const loggedOut = c.req.query("loggedout") === "1";
  const [requests, vendor] = await Promise.all([
    listRequestsForViewer({
      deviceToken: c.var.deviceToken,
      userId: c.var.session?.userId ?? null,
    }),
    getVendor(),
  ]);
  return c.html(
    <Document title="Your requests — 2 Fishes Seafood" deviceToken={c.var.deviceToken}>
      <BrandBar vendor={vendor} session={c.var.session} />
      <Page>
        <BackLink href="/">Back to 2 Fishes Seafood</BackLink>
        <h1>Your requests</h1>
        {claimedCount > 0 ? (
          <p class="notice notice-success" role="status">
            {claimedCount} {claimedCount === 1 ? "request" : "requests"} saved to your account.
          </p>
        ) : null}
        {loggedOut && !session ? (
          <p class="notice notice-info" role="status">
            You're logged out. Your requests are safe in your account. Log in any time to see them.
          </p>
        ) : null}
        <div class="stack-tight" data-requests-status>
          {session ? (
            <>
              <p class="muted">Logged in as {session.email}.</p>
              {session.isAdmin ? <p><a href="/admin">Admin</a></p> : null}
            </>
          ) : (
            <>
              <p class="muted">We're holding these on this phone for now. Log in and we'll save them to your account.</p>
              <form method="get" action="/login">
                <Button type="submit" variant="secondary">
                  Log in
                </Button>
              </form>
            </>
          )}
        </div>
        {requests.length === 0 ? <p class="muted">No requests yet.</p> : null}
        <div class="stack">
          {requests.map((request) => (
            <RequestListRow request={request} />
          ))}
        </div>
      </Page>
      <Footer />
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
      <BrandBar vendor={vendor} session={c.var.session} />
      <Page>
        <BackLink href="/requests">Your requests</BackLink>
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
      <Footer />
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
        <BrandBar vendor={vendor} session={c.var.session} />
        <Page>
          <BackLink href="/requests">Your requests</BackLink>
          <RequestHeaderCard request={request} />
          <Thread messages={withMessages?.messages ?? []} viewer="customer" customerName={request.contactName} />
          <MessageForm
            action={`/requests/${request.id}/messages`}
            csrfToken={csrfToken}
            errorText={result.errors.body}
          />
        </Page>
        <Footer />
      </Document>,
      400,
    );
  }

  await appendMessage(request.id, "customer", result.data.body);
  runInBackground(c, notifyVendorOfCustomerReply(c.env, request));
  return c.redirect(`/requests/${request.id}`);
});
