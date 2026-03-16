"use client";

import { useState, useTransition } from "react";
import { Button, Card, TextInput, Textarea } from "@/design-system";
import { confirmOrder, completeOrder, cancelOrderAdmin, markAsPaid } from "../order-functions";
import { getPaymentStatus, type PaymentStatus } from "@/utils/payments";
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

interface AdminOrderCardProps {
  order: Order;
  ctx: AppContext;
}

export function AdminOrderCard({ order, ctx }: AdminOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(order.price ? String(order.price / 100) : '');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const paymentStatus = getPaymentStatus(order);

  const paymentBadgeConfig: Record<PaymentStatus, { label: string; color: string }> = {
    unpaid: { label: 'UNPAID', color: 'var(--color-status-error)' },
    deposit: { label: 'DEPOSIT', color: 'var(--color-status-warning-bg)' },
    partial: { label: 'PARTIAL', color: 'var(--color-status-warning-bg)' },
    paid: { label: '\u2713 PAID', color: 'var(--color-status-success)' },
    overpaid: { label: 'OVERPAID', color: 'var(--color-status-success)' },
  };

  const paymentBadge = paymentStatus ? paymentBadgeConfig[paymentStatus] : null;

  const statusConfig = {
    pending: { label: 'Pending', color: 'var(--color-status-info-bg)', textColor: 'var(--color-text-primary)' },
    confirmed: { label: 'Confirmed', color: 'var(--color-status-success)', textColor: 'var(--color-text-primary)' },
    completed: { label: 'Completed', color: 'var(--color-text-secondary)', textColor: 'var(--color-text-inverse)' },
    cancelled: { label: 'Cancelled', color: 'var(--color-status-error)', textColor: 'var(--color-text-inverse)' }
  };

  const config = statusConfig[order.status as keyof typeof statusConfig];

  const handleConfirm = async () => {
    setErrorMessage(null);
    if (!priceInput.trim()) {
      setErrorMessage('Please enter a price before confirming');
      return;
    }
    const priceInCents = Math.round(parseFloat(priceInput) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setErrorMessage('Please enter a valid price');
      return;
    }

    startTransition(async () => {
      const result = await confirmOrder(order.id, priceInCents, adminNotes);
      if (result.success) {
        setIsEditing(false);
      } else {
        setErrorMessage(result.error || 'Failed to confirm order');
      }
    });
  };

  const handleComplete = async () => {
    if (!confirm('Mark this order as completed?')) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await completeOrder(order.id);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete order');
      }
    });
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order? Customer will see it as cancelled.')) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await cancelOrderAdmin(order.id);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to cancel order');
      }
    });
  };

  const handleMarkPaid = async () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await markAsPaid(order.id, paymentMethod, paymentNotes || undefined);
      if (result.success) {
        setShowPaymentModal(false);
      } else {
        setErrorMessage(result.error || 'Failed to mark as paid');
      }
    });
  };

  return (
    <div style={{
      border: order.status === 'pending' ? '3px solid var(--color-action-primary)' : '2px solid var(--color-border-light)',
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
        gap: 'var(--space-md)',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-action-primary)', marginBottom: 'var(--space-xs)' }}>
            Order #{order.orderNumber}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: config.color,
              color: config.textColor,
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-wide)'
            }}>
              {config.label}
            </div>
            {paymentBadge && (
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: paymentBadge.color,
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--letter-spacing-wide)'
              }}>
                {paymentBadge.label}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)'
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
                disabled={isPending}
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
                disabled={isPending}
              >
                Mark Complete
              </Button>
              {paymentStatus !== 'paid' && paymentStatus !== 'overpaid' && (
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

          {order.status === 'completed' && paymentStatus !== 'paid' && paymentStatus !== 'overpaid' && (
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
        background: 'var(--color-surface-secondary)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Customer
          </div>
          <div>{order.contactName}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            @{order.user.username}
          </div>
        </div>

        {order.contactPhone && (
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Phone
            </div>
            <a href={`tel:${order.contactPhone}`} style={{ color: 'var(--color-action-primary)', textDecoration: 'none' }}>
              {order.contactPhone}
            </a>
          </div>
        )}

        {order.preferredDate && (
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Preferred Date
            </div>
            <div>{new Date(order.preferredDate).toLocaleDateString()}</div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div style={{
        background: 'var(--color-surface-warm)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xs)' }}>Items Requested:</div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-md)' }}>{order.items}</div>
      </div>

      {/* Customer Notes */}
      {order.notes && (
        <div style={{
          padding: 'var(--space-sm)',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Customer Notes:</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>
            {order.notes}
          </div>
        </div>
      )}

      {/* Edit/Confirm Form */}
      {isEditing && order.status === 'pending' && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--color-status-success)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)'
        }}>
          <h3 style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-md)'
          }}>
            Confirm Order Details
          </h3>

          <TextInput
            label="Price"
            placeholder="$45-50 or Market price"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
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
              disabled={isPending || !priceInput.trim()}
              fullWidth
            >
              {isPending ? 'Confirming...' : 'Confirm Order'}
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
              background: 'var(--color-status-success)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                Price
              </div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                ${(order.price / 100).toFixed(2)}
              </div>
            </div>
          )}

          {order.adminNotes && (
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Your Notes:</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {order.adminNotes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Info Display (if paid) */}
      {(paymentStatus === 'paid' || paymentStatus === 'overpaid') && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--color-status-success)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
            Payment Received:
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Method: </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', textTransform: 'capitalize' }}>{order.paymentMethod || 'N/A'}</span>
            </div>
            {order.paidAt && (
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Date: </span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{new Date(order.paidAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          {order.paymentNotes && (
            <div style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-secondary)' }}>
              {order.paymentNotes}
            </div>
          )}
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPaymentModal && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--color-status-warning-bg)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)'
        }}>
          <h3 style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-md)'
          }}>
            Mark Order as Paid
          </h3>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-xs)',
              color: 'var(--color-text-primary)'
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
                border: '2px solid var(--color-border-light)',
                fontSize: 'var(--font-size-md)',
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
              disabled={isPending}
              fullWidth
            >
              {isPending ? 'Saving...' : 'Confirm Payment'}
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
