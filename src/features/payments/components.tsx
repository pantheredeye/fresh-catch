import type { FC } from "hono/jsx";
import { Button } from "@/ui/button";
import { formatCents } from "@/features/orders/components";

/**
 * Admin action: mint a Stripe Checkout link for what's still owed. Only
 * rendered when Stripe is configured *and* something is due — with payments
 * off, the thread simply doesn't offer it (issue #60's flippable module).
 */
export const RequestPaymentForm: FC<{ action: string; csrfToken: string; amountCents: number; isDeposit: boolean }> = ({
  action,
  csrfToken,
  amountCents,
  isDeposit,
}) => (
  <form method="post" action={action} class="stack">
    <input type="hidden" name="csrfToken" value={csrfToken} />
    <p class="field-helper">
      Posts a card payment link into the thread for {formatCents(amountCents)}
      {isDeposit ? " (deposit)" : ""}. The link is shareable — text or email it if that's easier.
    </p>
    <Button type="submit">Request payment ({formatCents(amountCents)})</Button>
  </form>
);

/** Where Stripe sends the customer back to (`success_url` / `cancel_url`). */
export const CheckoutNotice: FC<{ outcome: "success" | "cancel" }> = ({ outcome }) =>
  outcome === "success" ? (
    <p class="notice notice-success" role="status">
      Payment received — thank you! Your order below updates as soon as Fresh Catch's bank confirms it, usually within a
      few seconds.
    </p>
  ) : (
    <p class="notice notice-info" role="status">
      Payment cancelled — nothing was charged. The payment link in the thread still works whenever you're ready.
    </p>
  );
