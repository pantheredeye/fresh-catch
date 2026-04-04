"use client";

import { Container, Button } from "@/design-system";
import { OrderCard, PaymentStatusBanner } from "./components";
import type { AppContext } from "@/worker";
import type { FeeModel } from "@/utils/money";

type Order = {
  id: string;
  orderNumber: number;
  contactName: string;
  contactPhone: string | null;
  items: string;
  preferredDate: Date | null;
  notes: string | null;
  status: string;
  price: number | null;
  adminNotes: string | null;
  totalDue: number | null;
  amountPaid: number;
  depositAmount: number | null;
  platformFee: number | null;
  tipAmount: number;
  createdAt: Date;
  updatedAt: Date;
  organization: { name: string; slug: string };
};

interface CustomerOrdersUIProps {
  orders: Order[];
  ctx: AppContext;
  csrfToken: string;
  feeModel: FeeModel;
  checkoutStatus?: "success" | "cancel" | null;
  checkoutOrder?: number | null;
}

export function CustomerOrdersUI({ orders, ctx, csrfToken, feeModel, checkoutStatus, checkoutOrder }: CustomerOrdersUIProps) {
  const vendorSlug = ctx.browsingOrganization?.slug;
  const newOrderHref = vendorSlug ? `/orders/new?b=${vendorSlug}` : '/orders/new';
  return (
    <Container size="md">
      <PaymentStatusBanner status={checkoutStatus ?? null} orderNumber={checkoutOrder ?? null} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-xl)',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          margin: 0
        }}>
          Your Orders
        </h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.href = newOrderHref}
          >
            + New Order
          </Button>
        </div>

        {orders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <p style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>
              You haven't placed any orders yet.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.href = newOrderHref}
            >
              Place Your First Order
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                viewMode="customer"
                ctx={ctx}
                csrfToken={csrfToken}
                feeModel={feeModel}
              />
            ))}
          </div>
        )}
    </Container>
  );
}
