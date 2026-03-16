"use client";

import { useState } from "react";
import { Container, Select } from "@/design-system";
import { AdminOrderCard } from "./components/AdminOrderCard";
import type { AppContext } from "@/worker";

type Order = {
  id: string;
  userId: string;
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
  paymentMethod: string | null;
  paymentNotes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: {
    username: string;
    name: string | null;
  };
};

interface AdminOrdersUIProps {
  orders: Order[];
  ctx: AppContext;
}

export function AdminOrdersUI({ orders, ctx }: AdminOrdersUIProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  let filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(o =>
      o.items.toLowerCase().includes(query) ||
      o.contactName.toLowerCase().includes(query) ||
      o.user.username.toLowerCase().includes(query) ||
      o.orderNumber.toString().includes(query)
    );
  }

  // Apply date filter
  if (dateFilter) {
    const targetDate = new Date(dateFilter);
    filteredOrders = filteredOrders.filter(o => {
      if (!o.preferredDate) return false;
      const orderDate = new Date(o.preferredDate);
      return orderDate.toDateString() === targetDate.toDateString();
    });
  }

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <Container size="lg">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-lg)',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <h1 style={{
          fontSize: 'var(--font-size-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          margin: 0
        }}>
          Orders ({filteredOrders.length})
        </h1>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: `All Orders (${orders.length})` },
              { value: 'pending', label: `Pending (${counts.pending})` },
              { value: 'confirmed', label: `Confirmed (${counts.confirmed})` },
              { value: 'completed', label: `Completed (${counts.completed})` },
              { value: 'cancelled', label: `Cancelled (${counts.cancelled})` },
            ]}
            size="md"
          />
        </div>

        {/* Search and Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div>
            <label style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-xs)',
              display: 'block'
            }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Items, customer, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid var(--color-border-input)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-xs)',
              display: 'block'
            }}>
              Pickup Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid var(--color-border-input)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-xs)' }}>
            {searchQuery || dateFilter ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                }}
                style={{
                  padding: '10px 16px',
                  background: 'var(--color-text-tertiary)',
                  color: 'var(--color-text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Clear Filters
              </button>
            ) : null}
            {dateFilter && (
              <button
                onClick={() => window.open(`/admin/orders/print?date=${dateFilter}`, '_blank')}
                style={{
                  padding: '10px 16px',
                  background: 'var(--color-action-primary)',
                  color: 'var(--color-text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  flex: 1,
                  whiteSpace: 'nowrap'
                }}
              >
                Print View
              </button>
            )}
          </div>
        </div>

        {/* Status Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)'
        }}>
          <StatusCard label="Pending" count={counts.pending} color="var(--color-status-info-bg)" />
          <StatusCard label="Confirmed" count={counts.confirmed} color="var(--color-status-success)" />
          <StatusCard label="Completed" count={counts.completed} color="var(--color-text-secondary)" />
          <StatusCard label="Cancelled" count={counts.cancelled} color="var(--color-status-error)" />
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <p style={{ fontSize: 'var(--font-size-lg)' }}>
              No {statusFilter !== 'all' ? statusFilter : ''} orders found.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            {filteredOrders.map(order => (
              <AdminOrderCard
                key={order.id}
                order={order}
                ctx={ctx}
              />
            ))}
          </div>
        )}
    </Container>
  );
}

function StatusCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      padding: 'var(--space-md)',
      background: color,
      borderRadius: 'var(--radius-sm)',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: 'var(--font-size-4xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: label === 'Completed' || label === 'Cancelled' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
        marginBottom: 'var(--space-xs)'
      }}>
        {count}
      </div>
      <div style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        color: label === 'Completed' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--letter-spacing-wide)'
      }}>
        {label}
      </div>
    </div>
  );
}
