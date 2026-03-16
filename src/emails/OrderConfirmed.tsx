import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Button,
} from '@react-email/components';
import { formatCents, type FeeModel } from '@/utils/money';

interface OrderConfirmedProps {
  customerName: string;
  orderNumber: number;
  items: string;
  /** Base price in cents */
  priceCents: number | null;
  /** Platform fee in cents */
  platformFeeCents?: number | null;
  /** Fee model — controls fee visibility */
  feeModel?: FeeModel | null;
  /** Total due in cents (includes fee when customer/split absorbs) */
  totalDueCents?: number | null;
  /** Deposit amount in cents (if partial payment) */
  depositAmountCents?: number | null;
  /** Stripe checkout URL — shows Pay Now button when present */
  checkoutUrl?: string | null;
  adminNotes?: string;
  preferredDate?: string;
  businessName: string;
}

export function OrderConfirmed({
  customerName,
  orderNumber,
  items,
  priceCents,
  platformFeeCents,
  feeModel,
  totalDueCents,
  depositAmountCents,
  checkoutUrl,
  adminNotes,
  preferredDate,
  businessName,
}: OrderConfirmedProps) {
  const showFee =
    platformFeeCents != null &&
    platformFeeCents > 0 &&
    feeModel != null &&
    feeModel !== 'vendor';

  const displayTotal = totalDueCents ?? priceCents;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Confirmed!</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            Great news! Your order has been confirmed and will be ready for pickup.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>

            <Text style={label}>Items:</Text>
            <Text style={orderDetails}>{items}</Text>

            {/* Price breakdown */}
            {priceCents != null && (
              <Section style={breakdownBox}>
                <table style={breakdownTable} cellPadding="0" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td style={breakdownLabel}>Items</td>
                      <td style={breakdownValue}>{formatCents(priceCents)}</td>
                    </tr>
                    {showFee && (
                      <tr>
                        <td style={breakdownLabel}>Platform fee</td>
                        <td style={breakdownValue}>{formatCents(platformFeeCents!)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <Section style={priceBox}>
                  <Text style={priceLabel}>Total</Text>
                  <Text style={priceAmount}>
                    {displayTotal != null ? formatCents(displayTotal) : formatCents(priceCents)}
                  </Text>
                </Section>
              </Section>
            )}

            {/* Deposit info */}
            {depositAmountCents != null && depositAmountCents > 0 && (
              <Section style={depositBox}>
                <Text style={depositText}>
                  A deposit of <strong>{formatCents(depositAmountCents)}</strong> is
                  requested to secure your order. The remaining balance is due at pickup.
                </Text>
              </Section>
            )}

            {preferredDate && (
              <>
                <Text style={label}>Pickup Date:</Text>
                <Text style={orderDetails}>
                  {new Date(preferredDate).toLocaleDateString()}
                </Text>
              </>
            )}

            {adminNotes && (
              <>
                <Text style={label}>Pickup Instructions:</Text>
                <Text style={orderDetails}>{adminNotes}</Text>
              </>
            )}
          </Section>

          {/* Pay Now button — only when checkout URL is provided */}
          {checkoutUrl && (
            <Section style={paySection}>
              <Button style={payButton} href={checkoutUrl}>
                Pay Now
              </Button>
              <Text style={payAlternative}>or pay at pickup</Text>
            </Section>
          )}

          {!checkoutUrl && (
            <Text style={text}>
              Please bring payment when you pick up your order. We accept cash, Venmo, and Zelle.
            </Text>
          )}

          <Text style={text}>
            See you soon!
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {businessName} • Powered by Fresh Catch
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a2b3d',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#64748b',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const orderBox = {
  background: '#f8fafc',
  border: '2px solid #00d9b1',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 40px',
};

const orderNumberStyle = {
  color: '#00d9b1',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const label = {
  color: '#1a2b3d',
  fontSize: '14px',
  fontWeight: '600',
  margin: '16px 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const orderDetails = {
  color: '#475569',
  fontSize: '16px',
  margin: '0 0 8px 0',
  whiteSpace: 'pre-wrap' as const,
};

const breakdownBox = {
  margin: '16px 0',
};

const breakdownTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const breakdownLabel = {
  color: '#475569',
  fontSize: '14px',
  padding: '4px 0',
  textAlign: 'left' as const,
};

const breakdownValue = {
  color: '#475569',
  fontSize: '14px',
  padding: '4px 0',
  textAlign: 'right' as const,
};

const priceBox = {
  background: '#00d9b1',
  borderRadius: '8px',
  padding: '16px',
  margin: '8px 0 0 0',
  textAlign: 'center' as const,
};

const priceLabel = {
  color: '#1a2b3d',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const priceAmount = {
  color: '#1a2b3d',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const depositBox = {
  background: '#fff8e1',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '12px 0',
};

const depositText = {
  color: '#6d4c00',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const paySection = {
  textAlign: 'center' as const,
  margin: '24px 40px',
};

const payButton = {
  backgroundColor: '#00d9b1',
  borderRadius: '8px',
  color: '#1a2b3d',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 48px',
};

const payAlternative = {
  color: '#8898aa',
  fontSize: '13px',
  margin: '8px 0 0 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '26px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 40px',
  textAlign: 'center' as const,
};

export default OrderConfirmed;
