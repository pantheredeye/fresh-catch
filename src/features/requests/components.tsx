import type { FC } from "hono/jsx";
import type { FishRequest, RequestItem, RequestMessage } from "@/lib/db";
import type { InboxEntry } from "./queries";
import type { ItemStatus, RequestStatus } from "./validation";
import type { RequestableCatchItem } from "@/features/catch/queries";
import { needsReply, requestItemLine } from "./queries";
import { itemPriceText } from "./estimate";
import { formatPrice } from "@/lib/format";
import { assetUrl } from "@/lib/assets";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { ErrorSummary } from "@/ui/error-summary";
import { CardHeader } from "@/ui/card-header";
import {
  ITEM_STATUSES,
  MAX_REQUEST_ITEMS,
  OTHER_SPECIES,
  REQUEST_STATUSES,
  itemFieldId,
  resolutionFieldId,
  type RawResolutionRow,
} from "./validation";

export type RequestItemFormValues = {
  /** The species select/input value as posted — may be the `OTHER_SPECIES` sentinel. */
  species?: string;
  speciesOther?: string;
  quantity?: string;
  notes?: string;
};

export type RequestFormValues = {
  requestType?: string;
  items?: RequestItemFormValues[];
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

/** The display name a row resolves to, or undefined for an untouched/unnamed row. */
function rowSpeciesName(item: RequestItemFormValues): string | undefined {
  const species = item.species?.trim();
  if (species === OTHER_SPECIES) return item.speciesOther?.trim() || undefined;
  return species || undefined;
}

/** "Flounder — 2 lbs" (or bare species) for a row's folded summary line (issue 116); undefined until a species is named. Mirrored by the island's summaryText. */
function rowSummaryText(item: RequestItemFormValues): string | undefined {
  const name = rowSpeciesName(item);
  if (!name) return undefined;
  const quantity = item.quantity?.trim();
  return quantity ? `${name} — ${quantity}` : name;
}

/** Active-voice submit label, same verb the confirmation echoes (handoff §3: "Request bass" → "Requested"). */
function submitLabel(values: RequestFormValues): string {
  if (values.requestType === "question") return "Send question";
  const named = (values.items ?? []).map(rowSpeciesName).filter((name): name is string => !!name);
  if (named.length > 1) return `Request ${named.length} fish`;
  if (named.length === 1) return `Request ${named[0]}`;
  return "Request fish";
}

/**
 * Species select of live catch items + "Other" (reveals a free-text input via
 * a per-row CSS `:has()`, zero JS). A price-tagged catch item shows its price
 * in the option label — the only no-JS way to keep it next to the selection;
 * untagged items show none (issue 103: never invented). Prefill selects the match.
 */
const ItemSpeciesPicker: FC<{
  index: number;
  item: RequestItemFormValues;
  catchItems: RequestableCatchItem[];
  errors: Record<string, string>;
  autofocus?: boolean;
}> = ({ index, item, catchItems, errors, autofocus }) => {
  const species = item.species;
  const match =
    species && species !== OTHER_SPECIES
      ? catchItems.find((o) => o.name.toLowerCase() === species.trim().toLowerCase())
      : undefined;
  const isOther = species === OTHER_SPECIES || (!!species && !match);
  const selected = match?.name ?? (isOther ? OTHER_SPECIES : "");
  const otherValue = species === OTHER_SPECIES ? item.speciesOther : isOther ? species : undefined;
  const anyPriced = catchItems.some((o) => o.priceCents !== undefined);
  return (
    <>
      <Select
        id={itemFieldId(index, "species")}
        name={`items[${index}].species`}
        label="Species"
        value={selected}
        autofocus={autofocus}
        options={[
          { value: "", label: "Choose a fish" },
          ...catchItems.map((o) => ({
            value: o.name,
            label: o.priceCents !== undefined ? `${o.name} — ${formatPrice(o.priceCents)}` : o.name,
          })),
          { value: OTHER_SPECIES, label: "Other" },
        ]}
        helperText={anyPriced ? "Prices shown are this week's listed prices." : undefined}
        errorText={errors[itemFieldId(index, "species")]}
      />
      <div class="other-only">
        <Input
          id={itemFieldId(index, "speciesOther")}
          name={`items[${index}].speciesOther`}
          label="Which fish?"
          value={otherValue}
          helperText="Not on this week's list — 2 Fishes Seafood will confirm availability and price."
          errorText={errors[itemFieldId(index, "speciesOther")]}
        />
      </div>
    </>
  );
};

/** One fish of the order (issue 103). `catchItems` undefined = free-text species (admin walk-up, or no fresh catch this week). */
const ItemRow: FC<{
  index: number;
  item: RequestItemFormValues;
  catchItems?: RequestableCatchItem[];
  removable: boolean;
  /** Sole-row Remove ships `hidden`, not absent — the island (issue 104) un-hides it once a second row exists, with no markup to invent. */
  removeHidden?: boolean;
  /** Expanded (issue 116). Completed rows fold to their summary line; `open` keeps the row's fields visible — the sole row, a row with errors, the just-added row. */
  open?: boolean;
  errors: Record<string, string>;
  autofocus?: boolean;
}> = ({ index, item, catchItems, removable, removeHidden, open, errors, autofocus }) => (
  <fieldset class="item-row">
    <legend>Fish {index + 1}</legend>
    {/* Native <details>, not the Disclosure primitive — the fieldset is already
        the card, and the island needs the summary spans to keep the text live.
        Zero JS to expand/collapse; folded fields still post with the form. */}
    <details class="item-details" open={open}>
      <summary class="item-summary">
        <span class="item-summary-text">{rowSummaryText(item) ?? "Fish details"}</span>
        {/* Hints are the open/closed indicator (flex display drops the native
            marker) — aria-hidden since summary itself announces the state. */}
        <span class="muted item-summary-closed" aria-hidden="true">
          Edit
        </span>
        <span class="muted item-summary-open" aria-hidden="true">
          Hide
        </span>
      </summary>
      <div class="stack">
        {catchItems ? (
          <ItemSpeciesPicker index={index} item={item} catchItems={catchItems} errors={errors} autofocus={autofocus} />
        ) : (
          <Input
            id={itemFieldId(index, "species")}
            name={`items[${index}].species`}
            label="Species"
            value={item.species}
            autofocus={autofocus}
            helperText="What fish are you looking for?"
            errorText={errors[itemFieldId(index, "species")]}
          />
        )}
        <Input
          id={itemFieldId(index, "quantity")}
          name={`items[${index}].quantity`}
          label="Quantity"
          value={item.quantity}
          helperText='e.g. "2 lbs" or "a whole fish"'
          errorText={errors[itemFieldId(index, "quantity")]}
        />
        <Input
          id={itemFieldId(index, "notes")}
          name={`items[${index}].notes`}
          label="Note"
          value={item.notes}
          helperText="Prep or size for this fish — optional."
          errorText={errors[itemFieldId(index, "notes")]}
        />
        {removable ? (
          <Button
            type="submit"
            variant="ghost"
            inline
            name="action"
            value={`remove-${index}`}
            formNoValidate
            hidden={removeHidden}
            ariaLabel={`Remove fish ${index + 1}`}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </details>
  </fieldset>
);

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
  /** Customer form: this week's live catch for the species selects. Omit for the admin walk-up form — free-text species, same add/remove row builder. */
  catchItems?: RequestableCatchItem[];
  /** Row whose species field grabs focus — the no-JS "Add another fish" round trip lands you on the new row. */
  autofocusItem?: number;
}> = ({ action, csrfToken, values = {}, errors = {}, catchItems, autofocusItem }) => {
  const isQuestion = values.requestType === "question";
  const customer = catchItems !== undefined;
  const items = values.items?.length ? values.items : [{}];
  const rowCatchItems = customer && catchItems.length > 0 ? catchItems : undefined;
  // issue 116: an error anchor must never land inside a folded row.
  const rowHasError = (index: number) =>
    (["species", "speciesOther", "quantity", "notes"] as const).some((field) => errors[itemFieldId(index, field)]);
  // Fold completed rows so a long order stays scannable — but keep open the
  // sole row, an unnamed row (nothing to summarize), an erroring row, and the
  // row a no-JS "Add another fish" round trip just focused.
  const rowOpen = (item: RequestItemFormValues, index: number) =>
    items.length === 1 || !rowSummaryText(item) || rowHasError(index) || autofocusItem === index;
  return (
    <form method="post" action={action} class="request-form stack">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {/* Enter-key implicit submission clicks the FIRST submit button in tree
          order — without this hidden default, that'd be "Add another fish" or
          a row's "Remove" (both formnovalidate), turning Enter into a row
          edit or even data loss instead of a submit. */}
      <button type="submit" hidden aria-hidden="true" tabindex={-1}>
        Submit
      </button>
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
        <div class="stack" id="builder-rows" data-max-items={String(MAX_REQUEST_ITEMS)}>
          {items.map((item, index) => (
            <ItemRow
              index={index}
              item={item}
              catchItems={rowCatchItems}
              removable={customer || items.length > 1}
              removeHidden={customer && items.length === 1}
              open={rowOpen(item, index)}
              errors={errors}
              autofocus={autofocusItem === index}
            />
          ))}
        </div>
        {customer || items.length < MAX_REQUEST_ITEMS ? (
          // Customer: rendered even at the 8-fish cap (hidden) so the island can
          // bring it back after a client-side remove without inventing markup.
          <Button
            type="submit"
            variant="secondary"
            name="action"
            value="add-row"
            formNoValidate
            hidden={customer && items.length >= MAX_REQUEST_ITEMS}
          >
            Add another fish
          </Button>
        ) : null}
        {customer ? (
          // Inert blank row the island clones for client-side "Add another
          // fish" — ids inside duplicate row 0's but never join the document;
          // the island renumbers on clone.
          <template id="builder-row-template">
            <ItemRow index={0} item={{}} catchItems={rowCatchItems} removable open errors={{}} />
          </template>
        ) : null}
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
      {customer ? <script type="module" src={assetUrl("/js/order-builder.js")}></script> : null}
    </form>
  );
};

/** Post-submit confirmation (handoff §3: same verb all the way through — "Request bass" → "Requested"). */
export const RequestConfirmation: FC<{ requestType: string; hasCustomItems?: boolean }> = ({
  requestType,
  hasCustomItems,
}) => (
  <p class="notice notice-success" role="status">
    {requestType === "question" ? "Sent." : "Requested."} 2 Fishes Seafood will reply here.
    {hasCustomItems ? " Some of your fish aren't on this week's list — availability and price will be confirmed." : null}
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

/** "Halibut +2" — the headline species plus the other-item count (issue 105: email subjects, compact rows). */
export function requestTitleWithCount(request: FishRequest): string {
  const title = requestTitle(request);
  return request.requestType === "fish" && request.itemCount > 1 ? `${title} +${request.itemCount - 1}` : title;
}

const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  requested: "Pending",
  available: "Available",
  substituted: "Substituted",
  unavailable: "Unavailable",
};

/** Per-item resolution badge (issue 106) — nothing for the unresolved default. */
export const ItemStatusBadge: FC<{ status: string }> = ({ status }) =>
  status === "requested" ? null : (
    <span class={`badge badge-item-${status}`}>{ITEM_STATUS_LABEL[status as ItemStatus] ?? status}</span>
  );

/**
 * One item's resolution so far (issue 106), shown to both sides: status badge,
 * price/market-rate once Evan has touched the line, and his note. Untouched
 * lines render nothing extra — no "price TBD" noise before resolution starts.
 */
const ItemResolutionMeta: FC<{ item: RequestItem }> = ({ item }) => {
  const priced = item.priceCents != null || item.marketRate;
  return (
    <>
      {" "}
      <ItemStatusBadge status={item.status} />
      {priced && itemPriceText(item) ? <span class="muted"> · {itemPriceText(item)}</span> : null}
      {item.vendorNote ? <span class="muted"> — {item.vendorNote}</span> : null}
    </>
  );
};

/**
 * Header card with the full item list (issue 105) when the caller fetched items;
 * falls back to the denormalized headline quantity for bare-FishRequest
 * callers (inline-error re-renders that didn't need the join).
 */
export const RequestHeaderCard: FC<{ request: FishRequest & { items?: RequestItem[] } }> = ({ request }) => {
  const items = request.items ?? [];
  return (
    <div class="card stack">
      <CardHeader level={1} title={requestTitle(request)} meta={<RequestStatusBadge status={request.status} />} />
      {items.length > 0 ? (
        <ul class="stack stack-tight">
          {items.map((item) => (
            <li>
              {requestItemLine(item)}
              {item.isCustom ? (
                <>
                  {" "}
                  <span class="badge badge-custom">Not on list</span>
                </>
              ) : null}
              <ItemResolutionMeta item={item} />
            </li>
          ))}
        </ul>
      ) : request.quantity ? (
        <p class="muted">{request.quantity}</p>
      ) : null}
      <p class="muted">
        From {request.contactName}
        {request.contactEmail ? ` · ${request.contactEmail}` : ""}
        {request.contactPhone ? ` · ${request.contactPhone}` : ""}
      </p>
    </div>
  );
};

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

const ITEM_STATUS_OPTIONS = ITEM_STATUSES.map((status) => ({ value: status, label: ITEM_STATUS_LABEL[status] }));

/**
 * The admin per-item resolution form (issue 106): status, optional price, a
 * market-rate flag, and a customer-visible note per line. Two submits share
 * the save — "Save & send estimate" also posts the running estimate into the
 * thread, for the days Evan quotes before confirming the order.
 */
export const ItemResolutionForm: FC<{
  action: string;
  csrfToken: string;
  items: RequestItem[];
  errors?: Record<string, string>;
  /** The 400 re-render's as-submitted rows, aligned with `items` by index — echo what was typed, don't revert to what's stored. */
  drafts?: RawResolutionRow[];
}> = ({ action, csrfToken, items, errors = {}, drafts }) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <ErrorSummary items={Object.entries(errors).map(([id, message]) => ({ id, message }))} />
    {items.map((item, index) => {
      const draft = drafts?.[index];
      return (
        <fieldset class="item-row">
          <legend>{requestItemLine(item)}</legend>
          <div class="stack">
            <input type="hidden" name={`items[${index}].id`} value={item.id} />
            <Select
              id={resolutionFieldId(index, "status")}
              name={`items[${index}].status`}
              label="Status"
              value={draft ? draft.status : item.status}
              options={ITEM_STATUS_OPTIONS}
              errorText={errors[resolutionFieldId(index, "status")]}
            />
            <Input
              id={resolutionFieldId(index, "price")}
              name={`items[${index}].price`}
              label="Price"
              inputMode="decimal"
              value={draft ? draft.price : item.priceCents != null ? (item.priceCents / 100).toFixed(2) : undefined}
              helperText="Dollars — leave blank until you can quote it"
              errorText={errors[resolutionFieldId(index, "price")]}
            />
            <label class="check-field" for={`resolve-${index}-marketRate`}>
              <input
                type="checkbox"
                id={`resolve-${index}-marketRate`}
                name={`items[${index}].marketRate`}
                checked={draft ? draft.marketRate === "on" : item.marketRate}
              />
              Market rate
            </label>
            <Input
              id={resolutionFieldId(index, "vendorNote")}
              name={`items[${index}].vendorNote`}
              label="Note to customer"
              value={draft ? draft.vendorNote : item.vendorNote ?? undefined}
              helperText="Shown on their request — substitutions, sizing, caveats."
              errorText={errors[resolutionFieldId(index, "vendorNote")]}
            />
          </div>
        </fieldset>
      );
    })}
    <Button type="submit" name="action" value="save">
      Save items
    </Button>
    <Button type="submit" variant="secondary" name="action" value="save-estimate">
      Save &amp; send estimate
    </Button>
  </form>
);

/** "+2 more" replaces the headline quantity on multi-item rows — the count matters more than item 0's amount. */
function rowMeta(request: FishRequest): string | null {
  if (request.requestType === "fish" && request.itemCount > 1) return `+${request.itemCount - 1} more`;
  return request.quantity;
}

export const RequestListRow: FC<{ request: FishRequest }> = ({ request }) => (
  <a href={`/requests/${request.id}`} class="inbox-row">
    <span class="stack stack-tight">
      <strong>{requestTitle(request)}</strong>
      {rowMeta(request) ? <span class="muted">{rowMeta(request)}</span> : null}
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
        {rowMeta(entry) ? ` · ${rowMeta(entry)}` : ""}
      </span>
    </span>
    <span class="cluster">
      {needsReply(entry) ? <span class="badge badge-open">Needs reply</span> : null}
      <RequestStatusBadge status={entry.status} />
    </span>
  </a>
);
