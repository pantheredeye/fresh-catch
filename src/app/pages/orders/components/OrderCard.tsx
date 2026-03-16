"use client";

import { useState, useTransition } from "react";
import { Button, Card, Textarea, TextInput } from "@/design-system";
import { cancelOrder, updateOrder } from "../functions";
import type { AppContext } from "@/worker";

type Order = {
  id: string;
  orderNumber: number;
  contactName: string;
  contactPhone: string | null;
  items: string;
  preferredDate: Date | null;
  status: string;
  price: number | null;
  notes: string | null;
  adminNotes: string | null;
  createdAt: Date;
};

interface OrderCardProps {
  order: Order;
  viewMode: 'customer' | 'admin';
  ctx: AppContext;
}

export function OrderCard({ order, viewMode, ctx }: OrderCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState(order.items);
  const [notes, setNotes] = useState(order.notes || '');
  const [preferredDate, setPreferredDate] = useState(
    order.preferredDate ? new Date(order.preferredDate).toISOString().split('T')[0] : ''
  );

  const statusConfig = {
    pending: { label: 'Pending', color: 'var(--color-status-info-bg)', textColor: 'var(--color-text-primary)' },
    confirmed: { label: 'Confirmed', color: 'var(--color-status-success)', textColor: 'var(--color-text-primary)' },
    completed: { label: 'Completed', color: 'var(--color-text-secondary)', textColor: 'var(--color-text-inverse)' },
    cancelled: { label: 'Cancelled', color: 'var(--color-action-secondary)', textColor: 'var(--color-text-inverse)' }
  };

  const config = statusConfig[order.status as keyof typeof statusConfig];

  const handleUpdate = async () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateOrder(order.id, {
        items,
        notes: notes || null,
        preferredDate: preferredDate || null,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
      });
      if (result.success) {
        setIsEditing(false);
      } else {
        setErrorMessage(result.error || 'Failed to update order');
      }
    });
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await cancelOrder(order.id);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to cancel order');
      }
    });
  };

  return (
    <div style={{
      border: '2px solid var(--color-border-light)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      <Card>
        {errorMessage && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 'var(--space-md)'
          }}>
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-status-error)'}}>✕</button>
          </div>
        )}
        {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)'
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-action-primary)', marginBottom: 'var(--space-xs)' }}>
            Order #{order.orderNumber}
          </div>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: config.color,
            color: config.textColor,
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--letter-spacing-wide)',
            marginBottom: 'var(--space-xs)'
          }}>
            {config.label}
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            Ordered {new Date(order.createdAt).toLocaleDateString()}
          </div>
        </div>

        {viewMode === 'customer' && order.status === 'pending' && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Order'}
            </Button>
            <Button
              variant="cancel"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </div>
        )}

        {viewMode === 'customer' && order.status === 'completed' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const prefill = {
                items: order.items,
                notes: order.notes || '',
                preferredDate: order.preferredDate ? new Date(order.preferredDate).toISOString().split('T')[0] : ''
              };
              window.location.href = `/orders/new?prefill=${encodeURIComponent(JSON.stringify(prefill))}`;
            }}
          >
            Order Again
          </Button>
        )}
      </div>

      {/* Order Details */}
      <div style={{
        background: 'var(--color-surface-secondary)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xs)' }}>Items:</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{order.items}</div>
      </div>

      {/* Metadata Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-md)',
        fontSize: 'var(--font-size-sm)'
      }}>
        {order.preferredDate && (
          <div>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Preferred Date:
            </div>
            <div>{new Date(order.preferredDate).toLocaleDateString()}</div>
          </div>
        )}

        {order.price && (
          <div>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Price:
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              ${(order.price / 100).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Customer Notes */}
      {order.notes && (
        <div style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm)',
          background: 'var(--color-surface-warm)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Your Notes:</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>
            {order.notes}
          </div>
        </div>
      )}

      {/* Admin Notes (only in customer view if confirmed) */}
      {viewMode === 'customer' && order.adminNotes && order.status === 'confirmed' && (
        <div style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm)',
          background: 'var(--color-status-success)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Evan's Notes:</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {order.adminNotes}
          </div>
        </div>
      )}

      {/* Edit Form (pending orders only) */}
      {isEditing && order.status === 'pending' && viewMode === 'customer' && (
        <div style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-md)',
          background: 'var(--color-status-info-bg)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <h3 style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-md)',
            color: 'var(--color-text-primary)'
          }}>
            Edit Order
          </h3>

          <Textarea
            label="Items"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={4}
            required
          />

          <div>
            <label style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-wider)',
              marginBottom: 'var(--space-sm)',
              display: 'block'
            }}>
              Preferred Pickup Date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--color-border-light)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-warm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-modern)',
                outline: 'none'
              }}
            />
          </div>

          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            helperText="Special requests, questions, etc."
          />

          <div style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-md)'
          }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleUpdate}
              disabled={isPending || !items.trim()}
              fullWidth
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="cancel"
              size="md"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      </Card>
    </div>
  );
}
