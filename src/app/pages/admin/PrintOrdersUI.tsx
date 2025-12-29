"use client";

type Order = {
  id: string;
  orderNumber: number;
  contactName: string;
  contactPhone: string | null;
  items: string;
  notes: string | null;
  price: string | null;
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
          background: '#f0f0f0',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px',
              background: 'var(--ocean-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
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
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Back to Orders
          </button>
        </div>

        {/* Print header */}
        <div style={{
          borderBottom: '3px solid #000',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            {organizationName}
          </h1>
          <h2 style={{
            fontSize: '20px',
            margin: '0',
            fontWeight: 'normal'
          }}>
            Orders for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: '#666'
          }}>
            Total Orders: {orders.length} | Printed: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Orders checklist */}
        {orders.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            No confirmed orders for this date
          </div>
        ) : (
          <div>
            {orders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  border: '2px solid #000',
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
                    border: '3px solid #000',
                    borderRadius: '4px',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      Order #{order.orderNumber} - {order.contactName}
                    </div>
                    {order.contactPhone && (
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        {order.contactPhone}
                      </div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      background: order.paymentStatus === 'paid' ? '#d4edda' : '#fff3cd',
                      border: order.paymentStatus === 'paid' ? '2px solid #28a745' : '2px solid #ffc107',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}>
                      {order.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID'}
                    </div>
                    {order.paymentMethod && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {order.paymentMethod}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    color: '#666'
                  }}>
                    Items:
                  </div>
                  <div style={{
                    fontSize: '16px',
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
                  fontSize: '14px'
                }}>
                  {order.price && (
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Price:</span> {order.price}
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
          borderTop: '2px solid #ccc',
          fontSize: '14px',
          color: '#666'
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
