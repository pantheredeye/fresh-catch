"use client";

type Order = {
  id: string;
  orderNumber: number;
  contactName: string;
  contactPhone: string | null;
  items: string;
  notes: string | null;
  price: number | null;
  paymentStatus: string;
  paymentMethod: string | null;
  preferredDate: Date | null;
  user: {
    username: string;
    name: string | null;
  };
};

interface PrintOrdersUIProps {
  orders: Order[];
  date: Date;
  organizationName: string;
}

export function PrintOrdersUI({ orders, date, organizationName }: PrintOrdersUIProps) {
  return (
    <>
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
          }

          .no-print {
            display: none !important;
          }

          .page-break {
            page-break-after: always;
          }
        }

        @media screen {
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
        }
      `}</style>

      <div className="print-container">
        {/* Screen-only controls */}
        <div className="no-print" style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--color-surface-secondary)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px',
              background: 'var(--color-action-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Print Checklist
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: 'var(--color-text-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: 'var(--font-size-lg)',
              cursor: 'pointer'
            }}
          >
            Back to Orders
          </button>
        </div>

        {/* Print header */}
        <div style={{
          borderBottom: '3px solid var(--color-text-primary)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h1 style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            {organizationName}
          </h1>
          <h2 style={{
            fontSize: 'var(--font-size-2xl)',
            margin: '0',
            fontWeight: 'normal'
          }}>
            Orders for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Total Orders: {orders.length} | Printed: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Orders checklist */}
        {orders.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)'
          }}>
            No confirmed orders for this date
          </div>
        ) : (
          <div>
            {orders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  border: '2px solid var(--color-text-primary)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  pageBreakInside: 'avoid'
                }}
              >
                {/* Checkbox and order number */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid var(--color-text-primary)',
                    borderRadius: '4px',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      Order #{order.orderNumber} - {order.contactName}
                    </div>
                    {order.contactPhone && (
                      <div style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px'
                      }}>
                        {order.contactPhone}
                      </div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      background: order.paymentStatus === 'paid' ? 'var(--color-status-success-bg)' : 'var(--color-status-warning-bg)',
                      border: order.paymentStatus === 'paid' ? '2px solid var(--color-status-success-border)' : '2px solid var(--color-status-warning-border)',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}>
                      {order.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID'}
                    </div>
                    {order.paymentMethod && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {order.paymentMethod}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  background: 'var(--color-surface-secondary)',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Items:
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-lg)',
                    whiteSpace: 'pre-wrap',
                    fontWeight: 500
                  }}>
                    {order.items}
                  </div>
                </div>

                {/* Price and notes */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: 'var(--font-size-sm)'
                }}>
                  {order.price && (
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Price:</span> ${(order.price / 100).toFixed(2)}
                    </div>
                  )}
                  {order.notes && (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 'bold' }}>Notes:</span> {order.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: '2px solid var(--color-border-subtle)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Payment Summary:</strong>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              Paid: {orders.filter(o => o.paymentStatus === 'paid').length}
            </div>
            <div>
              Unpaid: {orders.filter(o => o.paymentStatus === 'unpaid').length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
