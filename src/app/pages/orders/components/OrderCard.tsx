"use client";

import { useState } from "react";
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
  price: string | null;
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
  const [cancelling, setCancelling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState(order.items);
  const [notes, setNotes] = useState(order.notes || '');
  const [preferredDate, setPreferredDate] = useState(
    order.preferredDate ? new Date(order.preferredDate).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);

  const statusConfig = {
    pending: { label: 'Pending', color: '#e0f2fe', textColor: 'var(--deep-navy)' },
    confirmed: { label: 'Confirmed', color: 'var(--mint-fresh)', textColor: 'var(--deep-navy)' },
    completed: { label: 'Completed', color: 'var(--cool-gray)', textColor: 'white' },
    cancelled: { label: 'Cancelled', color: 'var(--coral)', textColor: 'white' }
  };

  const config = statusConfig[order.status as keyof typeof statusConfig];

  const handleUpdate = async () => {
    setLoading(true);
    const result = await updateOrder(order.id, {
      items,
      notes: notes || null,
      preferredDate: preferredDate || null,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
    });

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to update order');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    const result = await cancelOrder(order.id);

    if (result.success) {
      window.location.reload(); // Refresh to show updated status
    } else {
      alert(result.error || 'Failed to cancel order');
      setCancelling(false);
    }
  };

  return (
    <div style={{
      border: '2px solid #e0e0e0',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      <Card>
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ocean-blue)', marginBottom: 'var(--space-xs)' }}>
            Order #{order.orderNumber}
          </div>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: config.color,
            color: config.textColor,
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 'var(--space-xs)'
          }}>
            {config.label}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--cool-gray)'
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
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
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
        background: 'var(--soft-gray)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Items:</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{order.items}</div>
      </div>

      {/* Metadata Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-md)',
        fontSize: '14px'
      }}>
        {order.preferredDate && (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '4px' }}>
              Preferred Date:
            </div>
            <div>{new Date(order.preferredDate).toLocaleDateString()}</div>
          </div>
        )}

        {order.price && (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '4px' }}>
              Price:
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--deep-navy)' }}>
              {order.price}
            </div>
          </div>
        )}
      </div>

      {/* Customer Notes */}
      {order.notes && (
        <div style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm)',
          background: 'var(--warm-white)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Your Notes:</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--cool-gray)' }}>
            {order.notes}
          </div>
        </div>
      )}

      {/* Admin Notes (only in customer view if confirmed) */}
      {viewMode === 'customer' && order.adminNotes && order.status === 'confirmed' && (
        <div style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm)',
          background: 'var(--mint-fresh)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Evan's Notes:</div>
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
          background: '#e0f2fe',
          borderRadius: 'var(--radius-sm)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: 'var(--space-md)',
            color: 'var(--deep-navy)'
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
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--deep-navy)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
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
                border: '2px solid #e0e0e0',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--warm-white)',
                color: 'var(--deep-navy)',
                fontSize: '16px',
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
              disabled={loading || !items.trim()}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Changes'}
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
