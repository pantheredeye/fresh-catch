"use client";

import { useState, useMemo, useTransition } from "react";
import { Button, Card, TextInput, Textarea } from "@/design-system";
import { confirmOrder, completeOrder, cancelOrderAdmin, markAsPaid } from "../order-functions";
import { getPaymentStatus, type PaymentStatus } from "@/utils/payments";
import { formatCents, parseDollars, calculatePlatformFee, type FeeModel } from "@/utils/money";
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
  organization?: {
    platformFeeBps: number;
    feeModel: FeeModel;
    defaultDepositBps: number | null;
    stripeAccountId: string | null;
    stripeOnboardingComplete: boolean;
  };
  payments: {
    id: string;
    amount: number;
    method: string;
    type: string;
    stripePaymentId: string | null;
    notes: string | null;
    createdAt: Date;
  }[];
};

interface AdminOrderCardProps {
  order: Order;
  ctx: AppContext;
  csrfToken: string;
}

export function AdminOrderCard({ order, ctx, csrfToken }: AdminOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(order.price ? String(order.price / 100) : '');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const remainingDue = order.totalDue != null ? Math.max(0, order.totalDue - order.amountPaid) : 0;
  const [paymentAmountInput, setPaymentAmountInput] = useState(remainingDue > 0 ? String(remainingDue / 100) : '');

  const hasStripe = !!(order.organization?.stripeAccountId && order.organization?.stripeOnboardingComplete);
  const defaultDepositBps = order.organization?.defaultDepositBps ?? null;
  const [depositEnabled, setDepositEnabled] = useState(hasStripe && defaultDepositBps !== null);
  const [depositInput, setDepositInput] = useState('');

  const feeBps = order.organization?.platformFeeBps ?? 500;
  const feeModel = order.organization?.feeModel ?? "customer";

  const feePreview = useMemo(() => {
    try {
      const cents = parseDollars(priceInput);
      if (cents <= 0) return null;
      const breakdown = calculatePlatformFee(cents, feeBps, feeModel);
      return { ...breakdown, basePriceCents: cents };
    } catch {
      return null;
    }
  }, [priceInput, feeBps, feeModel]);

  // Calculate deposit amount for preview
  const depositPreview = useMemo(() => {
    if (!depositEnabled || !feePreview) return null;
    try {
      const customCents = depositInput.trim() ? parseDollars(depositInput) : null;
      if (customCents !== null && customCents > 0) {
        return { depositAmount: customCents, remaining: feePreview.customerTotal - customCents };
      }
    } catch {
      // Invalid input, fall through to default
    }
    if (defaultDepositBps) {
      const defaultAmount = Math.round(feePreview.customerTotal * defaultDepositBps / 10000);
      return { depositAmount: defaultAmount, remaining: feePreview.customerTotal - defaultAmount };
    }
    return null;
  }, [depositEnabled, depositInput, feePreview, defaultDepositBps]);

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
    let priceInCents: number;
    try {
      priceInCents = parseDollars(priceInput);
    } catch {
      setErrorMessage('Please enter a valid price (e.g. 45.50)');
      return;
    }
    if (priceInCents <= 0) {
      setErrorMessage('Please enter a valid price');
      return;
    }

    // Build depositOverride: null = no deposit, number = override, undefined = use org default
    let depositOverride: number | null | undefined;
    if (!depositEnabled) {
      depositOverride = null;
    } else if (depositInput.trim()) {
      try {
        depositOverride = parseDollars(depositInput);
      } catch {
        setErrorMessage('Please enter a valid deposit amount');
        return;
      }
    } else {
      depositOverride = undefined; // use org default
    }

    startTransition(async () => {
      const result = await confirmOrder(csrfToken, order.id, priceInCents, adminNotes, depositOverride);
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
      const result = await completeOrder(csrfToken, order.id);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete order');
      }
    });
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order? Customer will see it as cancelled.')) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await cancelOrderAdmin(csrfToken, order.id);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to cancel order');
      }
    });
  };

  const handleMarkPaid = async (overrideAmountCents?: number) => {
    let amountCents: number;
    if (overrideAmountCents != null) {
      amountCents = overrideAmountCents;
    } else {
      try {
        amountCents = parseDollars(paymentAmountInput);
      } catch {
        setErrorMessage('Enter a valid payment amount');
        return;
      }
    }
    if (amountCents <= 0) {
      setErrorMessage('Amount must be greater than zero');
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await markAsPaid(csrfToken, order.id, amountCents, paymentMethod, paymentNotes || undefined);
      if (result.success) {
        setShowPaymentModal(false);
      } else {
        setErrorMessage(result.error || 'Failed to record payment');
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
        <div className="flex gap-sm flex-wrap">
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
                  Record Payment
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
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="surface-panel mb-md" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-md)',
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
        <div className="surface-panel mb-md" style={{ padding: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
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
            label="Price ($)"
            placeholder="45.50"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            required
            size="md"
            helperText="Enter dollar amount (e.g. 45.50)"
          />

          {feePreview && (
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-sm)',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Items</span>
                  <span>{formatCents(feePreview.basePriceCents)}</span>
                </div>
                {feePreview.platformFee > 0 && feeModel !== "vendor" && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform fee ({(feeBps / 100).toFixed(0)}%)</span>
                    <span>{formatCents(feePreview.platformFee)}</span>
                  </div>
                )}
                <div style={{
                  borderTop: '1px solid var(--color-border-subtle)',
                  marginTop: 'var(--space-xs)',
                  paddingTop: 'var(--space-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--font-size-md)',
                  color: 'var(--color-text-primary)',
                }}>
                  <span>Customer total</span>
                  <span>{formatCents(feePreview.customerTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Deposit Toggle */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              cursor: hasStripe ? 'pointer' : 'not-allowed',
              opacity: hasStripe ? 1 : 0.5,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}>
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={(e) => setDepositEnabled(e.target.checked)}
                disabled={!hasStripe}
                style={{ width: 18, height: 18, cursor: hasStripe ? 'pointer' : 'not-allowed' }}
              />
              Require deposit
              {!hasStripe && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-normal)' }}>
                  (Stripe not connected)
                </span>
              )}
            </label>

            {depositEnabled && feePreview && (
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <TextInput
                  label="Deposit amount ($)"
                  placeholder={defaultDepositBps
                    ? `Default: ${formatCents(Math.round(feePreview.customerTotal * defaultDepositBps / 10000))}`
                    : "Enter deposit amount"
                  }
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  size="md"
                  helperText={defaultDepositBps
                    ? `Leave blank to use org default (${(defaultDepositBps / 100).toFixed(0)}%)`
                    : "Enter dollar amount for deposit"
                  }
                />

                {depositPreview && (
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--color-surface-primary)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: 'var(--space-xs)',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>Deposit due now</span>
                      <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                        {formatCents(depositPreview.depositAmount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
                      <span>Remaining at pickup</span>
                      <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                        {formatCents(depositPreview.remaining)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Textarea
            label="Notes to Customer"
            placeholder="Pickup details, preparation notes, etc..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            helperText="Optional message to customer"
          />

          <div className="flex gap-sm mt-md">
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
              {order.price != null ? formatCents(order.price) : '—'}
            </div>
          </div>

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

      {/* Payment History */}
      {(order.status === 'confirmed' || order.status === 'completed') && (
        <div className="surface-panel mt-md">
          <div style={{
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-sm)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-primary)',
          }}>
            Payment History
          </div>

          {order.payments.length === 0 ? (
            <div style={{
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              fontStyle: 'italic',
            }}>
              No payments recorded
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-sm)',
                      background: 'var(--color-surface-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      gap: 'var(--space-sm)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{
                        textTransform: 'capitalize',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}>
                        {payment.type}
                      </span>
                      <span style={{
                        textTransform: 'capitalize',
                        color: 'var(--color-text-secondary)',
                      }}>
                        {payment.method}
                      </span>
                      {payment.stripePaymentId && (
                        <span style={{
                          padding: '2px 6px',
                          background: 'var(--color-action-primary)',
                          color: 'var(--color-text-inverse)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                        }}>
                          Stripe
                        </span>
                      )}
                      {payment.notes && (
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                          {payment.notes}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontWeight: 'var(--font-weight-bold)',
                      color: payment.type === 'refund' ? 'var(--color-status-error)' : 'var(--color-text-primary)',
                    }}>
                      {payment.type === 'refund' ? '-' : ''}{formatCents(Math.abs(payment.amount))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Running Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 'var(--space-sm)',
                paddingTop: 'var(--space-sm)',
                borderTop: '1px solid var(--color-border-subtle)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
              }}>
                Paid {formatCents(order.amountPaid)}{order.totalDue != null ? ` / ${formatCents(order.totalDue)}` : ''}
              </div>
            </>
          )}
        </div>
      )}

      {/* Record Payment Form */}
      {showPaymentModal && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--color-status-warning-bg)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'var(--space-md)'
        }}>
          <div className="flex-between mb-md">
            <h3 className="heading-lg m-0">
              Record Payment
            </h3>
            {remainingDue > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleMarkPaid(remainingDue)}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : `Record Full Payment (${formatCents(remainingDue)})`}
              </Button>
            )}
          </div>

          <TextInput
            label="Amount ($)"
            placeholder="0.00"
            value={paymentAmountInput}
            onChange={(e) => setPaymentAmountInput(e.target.value)}
            size="md"
            helperText={remainingDue > 0 ? `Remaining: ${formatCents(remainingDue)}` : undefined}
          />

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

          <div className="flex gap-sm mt-md">
            <Button
              variant="primary"
              size="md"
              onClick={handleMarkPaid}
              disabled={isPending}
              fullWidth
            >
              {isPending ? 'Saving...' : 'Record Payment'}
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
