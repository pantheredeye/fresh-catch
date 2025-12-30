"use client";

import { useState } from "react";
import { Button, Card, TextInput, Textarea } from "@/design-system";
import { confirmOrder, completeOrder, cancelOrderAdmin, markAsPaid } from "../order-functions";
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
  paymentStatus: string;
  paymentMethod: string | null;
  paymentNotes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: {
    username: string;
    name: string | null;
  };
};

interface AdminOrderCardProps {
  order: Order;
  ctx: AppContext;
}

export function AdminOrderCard({ order, ctx }: AdminOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState(order.price || '');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const statusConfig = {
    pending: { label: 'Pending', color: 'var(--sky-blue-light)', textColor: 'var(--deep-navy)' },
    confirmed: { label: 'Confirmed', color: 'var(--mint-fresh)', textColor: 'var(--deep-navy)' },
    completed: { label: 'Completed', color: 'var(--cool-gray)', textColor: 'white' },
    cancelled: { label: 'Cancelled', color: 'var(--coral)', textColor: 'white' }
  };

  const config = statusConfig[order.status as keyof typeof statusConfig];

  const handleConfirm = async () => {
    if (!price.trim()) {
      alert('Please enter a price before confirming');
      return;
    }

    setLoading(true);
    const result = await confirmOrder(order.id, price, adminNotes);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to confirm order');
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this order as completed?')) return;

    setLoading(true);
    const result = await completeOrder(order.id);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to complete order');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order? Customer will see it as cancelled.')) return;

    setLoading(true);
    const result = await cancelOrderAdmin(order.id);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to cancel order');
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    const result = await markAsPaid(order.id, paymentMethod, paymentNotes || undefined);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || 'Failed to mark as paid');
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: order.status === 'pending' ? '3px solid var(--ocean-blue)' : '2px solid var(--border-light)',
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
        gap: 'var(--space-md)',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ocean-blue)', marginBottom: 'var(--space-xs)' }}>
            Order #{order.orderNumber}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: config.color,
              color: config.textColor,
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {config.label}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: order.paymentStatus === 'paid' ? 'var(--mint-fresh)' : 'var(--amber-light)',
              color: 'var(--deep-navy)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {order.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID'}
            </div>
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--cool-gray)'
          }}>
            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {order.status === 'pending' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel Edit' : 'Confirm Order'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                Reject
              </Button>
            </>
          )}

          {order.status === 'confirmed' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                disabled={loading}
              >
                Mark Complete
              </Button>
              {order.paymentStatus === 'unpaid' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPaymentModal(!showPaymentModal)}
                >
                  Mark as Paid
                </Button>
              )}
            </>
          )}

          {order.status === 'completed' && order.paymentStatus === 'unpaid' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPaymentModal(!showPaymentModal)}
            >
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-md)',
        padding: 'var(--space-md)',
        background: 'var(--soft-gray)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '4px' }}>
            Customer
          </div>
          <div>{order.contactName}</div>
          <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>
            @{order.user.username}
          </div>
        </div>

        {order.contactPhone && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '4px' }}>
              Phone
            </div>
            <a href={`tel:${order.contactPhone}`} style={{ color: 'var(--ocean-blue)', textDecoration: 'none' }}>
              {order.contactPhone}
            </a>
          </div>
        )}

        {order.preferredDate && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '4px' }}>
              Preferred Date
            </div>
            <div>{new Date(order.preferredDate).toLocaleDateString()}</div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div style={{
        background: 'var(--warm-white)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Items Requested:</div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px' }}>{order.items}</div>
      </div>

      {/* Customer Notes */}
      {order.notes && (
        <div style={{
          padding: 'var(--space-sm)',
          background: 'var(--soft-gray)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Customer Notes:</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--cool-gray)' }}>
            {order.notes}
          </div>
        </div>
      )}

      {/* Edit/Confirm Form */}
      {isEditing && order.status === 'pending' && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--mint-fresh)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: 'var(--space-md)'
          }}>
            Confirm Order Details
          </h3>

          <TextInput
            label="Price"
            placeholder="$45-50 or Market price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            size="md"
            helperText="This will be visible to customer"
          />

          <Textarea
            label="Notes to Customer"
            placeholder="Pickup details, preparation notes, etc..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            helperText="Optional message to customer"
          />

          <div style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-md)'
          }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={loading || !price.trim()}
              fullWidth
            >
              {loading ? 'Confirming...' : 'Confirm Order'}
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

      {/* Display Price/Notes (confirmed/completed orders) */}
      {(order.status === 'confirmed' || order.status === 'completed') && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: order.adminNotes ? '200px 1fr' : '1fr',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-md)'
        }}>
          {order.price && (
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--mint-fresh)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Price
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--deep-navy)' }}>
                {order.price}
              </div>
            </div>
          )}

          {order.adminNotes && (
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--soft-gray)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Your Notes:</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {order.adminNotes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Info Display (if paid) */}
      {order.paymentStatus === 'paid' && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--mint-fresh)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--deep-navy)' }}>
            Payment Received:
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--cool-gray)' }}>Method: </span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{order.paymentMethod || 'N/A'}</span>
            </div>
            {order.paidAt && (
              <div>
                <span style={{ color: 'var(--cool-gray)' }}>Date: </span>
                <span style={{ fontWeight: 600 }}>{new Date(order.paidAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          {order.paymentNotes && (
            <div style={{ marginTop: 'var(--space-xs)', color: 'var(--cool-gray)' }}>
              {order.paymentNotes}
            </div>
          )}
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPaymentModal && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--amber-light)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: 'var(--space-md)'
          }}>
            Mark Order as Paid
          </h3>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: 'var(--space-xs)',
              color: 'var(--deep-navy)'
            }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                border: '2px solid var(--border-light)',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            >
              <option value="cash">Cash</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Textarea
            label="Payment Notes (optional)"
            placeholder="e.g., Venmo: @evan, Transaction ID: 12345"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            rows={2}
            helperText="Optional details about the payment"
          />

          <div style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-md)'
          }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleMarkPaid}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Saving...' : 'Confirm Payment'}
            </Button>
            <Button
              variant="cancel"
              size="md"
              onClick={() => setShowPaymentModal(false)}
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
