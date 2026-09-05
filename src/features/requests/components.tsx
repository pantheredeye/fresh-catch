import type { FC } from "hono/jsx";
import type { FishRequest, RequestMessage } from "@/lib/db";
import type { InboxEntry } from "./queries";
import type { RequestStatus } from "./validation";
import { needsReply } from "./queries";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { REQUEST_STATUSES } from "./validation";

export type RequestFormValues = {
  requestType?: string;
  species?: string;
  quantity?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

function asOptional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

export function requestToFormValues(request: FishRequest): RequestFormValues {
  return {
    requestType: request.requestType,
    species: asOptional(request.species),
    quantity: asOptional(request.quantity),
    notes: asOptional(request.notes),
    contactName: request.contactName,
    contactEmail: asOptional(request.contactEmail),
    contactPhone: asOptional(request.contactPhone),
  };
}

/**
 * One form for both request types (plan addendum #2) — a radio toggle plus a
 * pure-CSS `:has()` rule (`.request-form:has(#type-question:checked)
 * .fish-only`) hides the species/quantity fields for questions. Zero JS
 * (R10): neither field carries `required` since a hidden-but-required input
 * would block submission in some browsers — the server is the source of
 * truth for which fields are mandatory per type.
 */
export const RequestForm: FC<{
  action: string;
  csrfToken: string;
  values?: RequestFormValues;
  errors?: Record<string, string>;
}> = ({ action, csrfToken, values = {}, errors = {} }) => {
  const isQuestion = values.requestType === "question";
  return (
    <form method="post" action={action} class="request-form stack">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <fieldset class="request-type-toggle">
        <legend class="field-label">What do you need?</legend>
        <label>
          <input type="radio" id="type-fish" name="requestType" value="fish" checked={!isQuestion} /> Request an
          order
        </label>
        <label>
          <input type="radio" id="type-question" name="requestType" value="question" checked={isQuestion} /> Ask a
          question
        </label>
      </fieldset>
      <div class="fish-only stack">
        <Input
          id="species"
          name="species"
          label="Species"
          value={values.species}
          helperText="What fish are you looking for?"
          errorText={errors.species}
        />
        <Input
          id="quantity"
          name="quantity"
          label="Quantity"
          value={values.quantity}
          helperText='e.g. "2 lbs" or "a whole fish"'
          errorText={errors.quantity}
        />
      </div>
      <Textarea
        id="notes"
        name="notes"
        label="Details"
        value={values.notes}
        helperText="Add details, or ask your question here."
        errorText={errors.notes}
      />
      <Input
        id="contactName"
        name="contactName"
        label="Your name"
        required
        value={values.contactName}
        errorText={errors.contactName}
      />
      <Input
        id="contactEmail"
        name="contactEmail"
        label="Email"
        type="email"
        value={values.contactEmail}
        helperText="Optional — we'll also reply here in the thread."
        errorText={errors.contactEmail}
      />
      <Input
        id="contactPhone"
        name="contactPhone"
        label="Phone"
        type="tel"
        value={values.contactPhone}
        errorText={errors.contactPhone}
      />
      <Button type="submit">Send request</Button>
    </form>
  );
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Open",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  declined: "Declined",
};

export const RequestStatusBadge: FC<{ status: string }> = ({ status }) => (
  <span class={`badge badge-${status}`}>{STATUS_LABEL[status as RequestStatus] ?? status}</span>
);

export function requestTitle(request: FishRequest): string {
  return request.requestType === "question" ? "Question" : (request.species ?? "Request");
}

export const RequestHeaderCard: FC<{ request: FishRequest }> = ({ request }) => (
  <div class="card stack">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <h1 style="margin: 0;">{requestTitle(request)}</h1>
      <RequestStatusBadge status={request.status} />
    </div>
    {request.quantity ? <p class="field-helper">{request.quantity}</p> : null}
    <p class="field-helper">
      From {request.contactName}
      {request.contactEmail ? ` · ${request.contactEmail}` : ""}
      {request.contactPhone ? ` · ${request.contactPhone}` : ""}
    </p>
  </div>
);

function formatMessageTime(date: Date): string {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function senderLabel(sender: string, viewer: "customer" | "admin", customerName: string): string {
  if (sender === "vendor") return viewer === "admin" ? "You" : "Fresh Catch";
  return viewer === "customer" ? "You" : customerName;
}

export const Thread: FC<{ messages: RequestMessage[]; viewer: "customer" | "admin"; customerName: string }> = ({
  messages,
  viewer,
  customerName,
}) => (
  <div class="thread stack">
    {messages.map((message) => (
      <div class={`msg msg-${message.sender}`}>
        <p style="margin: 0; white-space: pre-wrap;">{message.body}</p>
        <p class="msg-meta">
          {senderLabel(message.sender, viewer, customerName)} ·{" "}
          <time datetime={message.createdAt.toISOString()}>{formatMessageTime(message.createdAt)}</time>
        </p>
      </div>
    ))}
  </div>
);

export const MessageForm: FC<{ action: string; csrfToken: string; errorText?: string }> = ({
  action,
  csrfToken,
  errorText,
}) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Textarea id="body" name="body" label="Reply" errorText={errorText} />
    <Button type="submit">Send</Button>
  </form>
);

const STATUS_OPTIONS = REQUEST_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }));

/** Vendor reply + optional status change in one POST (plan commit 5) — no separate round trip for the common case. */
export const AdminReplyForm: FC<{ action: string; csrfToken: string; currentStatus: string; errorText?: string }> = ({
  action,
  csrfToken,
  currentStatus,
  errorText,
}) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Textarea id="body" name="body" label="Reply" errorText={errorText} />
    <Select id="status" name="status" label="Status" value={currentStatus} options={STATUS_OPTIONS} />
    <Button type="submit">Send reply</Button>
  </form>
);

/** Status-only transition, no message required. */
export const StatusForm: FC<{ action: string; csrfToken: string; currentStatus: string }> = ({
  action,
  csrfToken,
  currentStatus,
}) => (
  <form method="post" action={action} style="display: flex; align-items: flex-end; gap: 12px;">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Select id="status-only" name="status" label="Set status" value={currentStatus} options={STATUS_OPTIONS} />
    <Button type="submit" variant="secondary">
      Update
    </Button>
  </form>
);

export const RequestListRow: FC<{ request: FishRequest }> = ({ request }) => (
  <a href={`/requests/${request.id}`} class="inbox-row">
    <span class="stack" style="gap: 4px;">
      <strong>{requestTitle(request)}</strong>
      {request.quantity ? <span class="field-helper">{request.quantity}</span> : null}
    </span>
    <RequestStatusBadge status={request.status} />
  </a>
);

export const InboxRow: FC<{ entry: InboxEntry }> = ({ entry }) => (
  <a href={`/admin/requests/${entry.id}`} class="inbox-row">
    <span class="stack" style="gap: 4px;">
      <strong>{requestTitle(entry)}</strong>
      <span class="field-helper">
        {entry.contactName}
        {entry.quantity ? ` · ${entry.quantity}` : ""}
      </span>
    </span>
    <span style="display: flex; align-items: center; gap: 12px;">
      {needsReply(entry) ? <span class="badge badge-open">Needs reply</span> : null}
      <RequestStatusBadge status={entry.status} />
    </span>
  </a>
);
