import type { FC } from "hono/jsx";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { CardHeader } from "@/ui/card-header";
import type { OrderWithPayments } from "./queries";
import { parseOrderItems, type OrderItemSnapshot } from "./items";
import { PAYMENT_METHODS } from "./validation";

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  other: "Other",
  stripe: "Card",
};

/** Per-item price, tolerant of partial/unknown pricing (epic 101): a quote, "Market rate", or "Price TBD". */
function itemPriceLabel(item: OrderItemSnapshot): string {
  if (item.priceCents != null) return formatCents(item.priceCents);
  return item.marketRate ? "Market rate" : "Price TBD";
}

export const OrderSummaryCard: FC<{ order: OrderWithPayments }> = ({ order }) => {
  const remaining = order.totalDue != null ? Math.max(order.totalDue - order.amountPaid, 0) : null;
  const snapshot = parseOrderItems(order.items);
  return (
    <div class="card stack">
      <CardHeader
        title={`Order #${order.orderNumber}`}
        meta={
          <span class={`badge ${order.paidAt ? "badge-confirmed" : "badge-open"}`}>
            {order.paidAt ? "Paid" : "Unpaid"}
          </span>
        }
      />
      {snapshot && snapshot.items.length > 0 ? (
        <ul class="stack stack-tight">
          {snapshot.items.map((item) => (
            <li>
              {item.species}
              {item.quantity ? ` — ${item.quantity}` : ""}
              {item.notes ? ` (${item.notes})` : ""}
              {` · ${itemPriceLabel(item)}`}
            </li>
          ))}
        </ul>
      ) : null}
      {snapshot?.orderNotes ? <p class="muted">{snapshot.orderNotes}</p> : null}
      {order.price != null ? <p class="muted">Price: {formatCents(order.price)}</p> : null}
      {order.depositAmount != null ? <p class="muted">Deposit: {formatCents(order.depositAmount)}</p> : null}
      <p class="muted">
        Paid so far: {formatCents(order.amountPaid)}
        {remaining != null && remaining > 0 ? ` · ${formatCents(remaining)} remaining` : ""}
      </p>
      {order.payments.length > 0 ? (
        <ul class="stack">
          {order.payments.map((payment) => (
            <li>
              {payment.type === "refund" ? `Refund ${formatCents(-payment.amount)}` : formatCents(payment.amount)} via{" "}
              {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
              {payment.notes ? ` — ${payment.notes}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export const ConfirmOrderForm: FC<{ action: string; csrfToken: string; errors?: Record<string, string> }> = ({
  action,
  csrfToken,
  errors = {},
}) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Input
      id="price"
      name="price"
      label="Price"
      inputMode="decimal"
      helperText="Dollars, e.g. 45.00"
      errorText={errors.price}
    />
    <Input
      id="deposit"
      name="deposit"
      label="Deposit"
      inputMode="decimal"
      helperText="Optional, dollars — leave blank for none"
      errorText={errors.deposit}
    />
    <Textarea id="adminNotes" name="adminNotes" label="Notes" helperText="Optional, admin-only" errorText={errors.adminNotes} />
    <Button type="submit">Confirm order</Button>
  </form>
);

const METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }));

export const MarkPaidForm: FC<{ action: string; csrfToken: string; errors?: Record<string, string> }> = ({
  action,
  csrfToken,
  errors = {},
}) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <Input
      id="amount"
      name="amount"
      label="Amount"
      inputMode="decimal"
      helperText="Dollars, e.g. 45.00"
      errorText={errors.amount}
    />
    <Select id="method" name="method" label="Method" options={METHOD_OPTIONS} value="cash" />
    <Textarea id="notes" name="notes" label="Notes" helperText="Optional" errorText={errors.notes} />
    <Button type="submit" variant="secondary">
      Mark paid
    </Button>
  </form>
);
