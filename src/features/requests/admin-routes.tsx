import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import { appendMessage, getRequest, getRequestWithMessages, listInbox, setRequestStatus, type InboxFilter } from "./queries";
import { parseMessageForm, parseStatusUpdate } from "./validation";
import { AdminReplyForm, InboxRow, RequestHeaderCard, StatusForm, Thread, requestTitle } from "./components";

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

requestsAdminRoutes.get("/admin/requests/:id", async (c) => {
  const request = await getRequestWithMessages(c.req.param("id"));
  if (!request) return c.text("Not found", 404);
  const csrfToken = c.var.session!.csrfToken;

  return c.html(
    <Document title={`${requestTitle(request)} — Admin`}>
      <main class="page stack">
        <p>
          <a href="/admin/requests">← Requests</a>
        </p>
        <RequestHeaderCard request={request} />
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
