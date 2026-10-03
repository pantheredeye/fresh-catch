import type { FC } from "hono/jsx";
import type { FishRequest, RequestMessage } from "@/lib/db";
import type { InboxEntry } from "./queries";
import type { RequestStatus } from "./validation";
import { needsReply } from "./queries";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { ErrorSummary } from "@/ui/error-summary";
import { CardHeader } from "@/ui/card-header";
import { OTHER_SPECIES, REQUEST_STATUSES } from "./validation";

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

/** Active-voice submit label, same verb the confirmation echoes (handoff §3: "Request bass" → "Requested"). */
function submitLabel(values: RequestFormValues): string {
  if (values.requestType === "question") return "Send question";
  if (values.species) return `Request ${values.species}`;
  return "Request fish";
}

/** Species select of live catch items + "Other" (reveals a free-text input via CSS `:has()`, zero JS). Prefill selects the match. */
const SpeciesPicker: FC<{ options: string[]; species?: string; errors: Record<string, string> }> = ({
  options,
  species,
  errors,
}) => {
  const match = species ? options.find((o) => o.toLowerCase() === species.trim().toLowerCase()) : undefined;
  const isOther = species === OTHER_SPECIES || (!!species && !match);
  const selected = match ?? (isOther ? OTHER_SPECIES : "");
  return (
    <>
      <Select
        id="species"
        name="species"
        label="Species"
        value={selected}
        options={[
          { value: "", label: "Choose a fish" },
          ...options.map((o) => ({ value: o, label: o })),
          { value: OTHER_SPECIES, label: "Other" },
        ]}
        errorText={errors.species}
      />
      <div class="other-only">
        <Input
          id="speciesOther"
          name="speciesOther"
          label="Which fish?"
          value={species && species !== OTHER_SPECIES && !match ? species : undefined}
        />
      </div>
    </>
  );
};

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
  /** Customer form: this week's live species for the select. Omit for the admin walk-up form (free-text species, radio toggle). */
  speciesOptions?: string[];
}> = ({ action, csrfToken, values = {}, errors = {}, speciesOptions }) => {
  const isQuestion = values.requestType === "question";
  const customer = speciesOptions !== undefined;
  return (
    <form method="post" action={action} class="request-form stack">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <ErrorSummary items={Object.entries(errors).map(([id, message]) => ({ id, message }))} />
      {customer ? (
        <fieldset class="segmented">
          <legend class="field-label">What do you need?</legend>
          <div class="segmented-options">
            <label>
              <input type="radio" id="type-fish" name="requestType" value="fish" checked={!isQuestion} />
              <span>Request an order</span>
            </label>
            <label>
              <input type="radio" id="type-question" name="requestType" value="question" checked={isQuestion} />
              <span>Ask a question</span>
            </label>
          </div>
        </fieldset>
      ) : (
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
      )}
      <div class="fish-only stack">
        {customer && speciesOptions.length > 0 ? (
          <SpeciesPicker options={speciesOptions} species={values.species} errors={errors} />
        ) : (
          <Input
            id="species"
            name="species"
            label="Species"
            value={values.species}
            helperText="What fish are you looking for?"
            errorText={errors.species}
          />
        )}
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
        helperText="Email or phone — at least one. We'll also reply here in the thread."
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
      <Button type="submit">
        <span class="submit-fish">{submitLabel({ ...values, requestType: "fish" })}</span>
        <span class="submit-question">Send question</span>
      </Button>
    </form>
  );
};

/** Post-submit confirmation (handoff §3: same verb all the way through — "Request bass" → "Requested"). */
export const RequestConfirmation: FC<{ requestType: string }> = ({ requestType }) => (
  <p class="notice notice-success" role="status">
    {requestType === "question" ? "Sent." : "Requested."} 2 Fishes Seafood will reply here.
  </p>
);

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
    <CardHeader level={1} title={requestTitle(request)} meta={<RequestStatusBadge status={request.status} />} />
    {request.quantity ? <p class="muted">{request.quantity}</p> : null}
    <p class="muted">
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
  if (sender === "vendor") return viewer === "admin" ? "You" : "2 Fishes Seafood";
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
        <p>{message.body}</p>
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
  <form method="post" action={action} class="cluster align-end">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Select id="status-only" name="status" label="Set status" value={currentStatus} options={STATUS_OPTIONS} />
    <Button type="submit" variant="secondary" inline>
      Update
    </Button>
  </form>
);

export const RequestListRow: FC<{ request: FishRequest }> = ({ request }) => (
  <a href={`/requests/${request.id}`} class="inbox-row">
    <span class="stack stack-tight">
      <strong>{requestTitle(request)}</strong>
      {request.quantity ? <span class="muted">{request.quantity}</span> : null}
    </span>
    <RequestStatusBadge status={request.status} />
  </a>
);

export const InboxRow: FC<{ entry: InboxEntry }> = ({ entry }) => (
  <a href={`/admin/requests/${entry.id}`} class="inbox-row">
    <span class="stack stack-tight">
      <strong>{requestTitle(entry)}</strong>
      <span class="muted">
        {entry.contactName}
        {entry.quantity ? ` · ${entry.quantity}` : ""}
      </span>
    </span>
    <span class="cluster">
      {needsReply(entry) ? <span class="badge badge-open">Needs reply</span> : null}
      <RequestStatusBadge status={entry.status} />
    </span>
  </a>
);
