"use client";

import { Container, Button } from "@/design-system";
import { OrderCard } from "./components/OrderCard";
import type { AppContext } from "@/worker";

type Order = {
  id: string;
  orderNumber: number;
  contactName: string;
  contactPhone: string | null;
  items: string;
  preferredDate: Date | null;
  notes: string | null;
  status: string;
  price: string | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface CustomerOrdersUIProps {
  orders: Order[];
  ctx: AppContext;
}

export function CustomerOrdersUI({ orders, ctx }: CustomerOrdersUIProps) {
  return (
    <Container size="md">
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
          color: 'var(--deep-navy)',
          fontFamily: 'var(--font-display)',
          margin: 0
        }}>
          Your Orders
        </h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.href = '/orders/new'}
          >
            + New Order
          </Button>
        </div>

        {orders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-xl)',
            color: 'var(--cool-gray)'
          }}>
            <p style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>
              You haven't placed any orders yet.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.href = '/orders/new'}
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
              />
            ))}
          </div>
        )}
    </Container>
  );
}
