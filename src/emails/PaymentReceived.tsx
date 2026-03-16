import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';
import { formatCents } from '@/utils/money';

interface PaymentReceivedProps {
  orderNumber: number;
  /** Amount paid in cents */
  amountPaid: number;
  /** Total due in cents */
  totalDue: number;
  /** Remaining balance in cents */
  remainingBalance: number;
  paymentMethod: string;
  businessName: string;
}

export function PaymentReceived({
  orderNumber,
  amountPaid,
  totalDue,
  remainingBalance,
  paymentMethod,
  businessName,
}: PaymentReceivedProps) {
  const isFullyPaid = remainingBalance <= 0;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Received!</Heading>

          <Text style={text}>
            Thank you for your payment on Order #{orderNumber}.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>

            <table style={breakdownTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={breakdownLabel}>Amount Paid</td>
                  <td style={breakdownValue}>{formatCents(amountPaid)}</td>
                </tr>
                <tr>
                  <td style={breakdownLabel}>Payment Method</td>
                  <td style={breakdownValue}>{paymentMethod}</td>
                </tr>
                <tr>
                  <td style={breakdownLabel}>Order Total</td>
                  <td style={breakdownValue}>{formatCents(totalDue)}</td>
                </tr>
              </tbody>
            </table>

            {isFullyPaid ? (
              <Section style={paidBox}>
                <Text style={paidText}>Fully Paid</Text>
              </Section>
            ) : (
              <Section style={remainingBox}>
                <Text style={remainingText}>
                  Remaining balance: <strong>{formatCents(remainingBalance)}</strong>
                </Text>
              </Section>
            )}
          </Section>

          {isFullyPaid ? (
            <Text style={text}>
              Your order is fully paid. We'll see you at pickup!
            </Text>
          ) : (
            <Text style={text}>
              The remaining balance of {formatCents(remainingBalance)} is due at pickup.
            </Text>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {businessName} &bull; Powered by Fresh Catch
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

const paidBox = {
  background: '#00d9b1',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0 0 0',
  textAlign: 'center' as const,
};

const paidText = {
  color: '#1a2b3d',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
};

const remainingBox = {
  background: '#fff8e1',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0 0 0',
};

const remainingText = {
  color: '#6d4c00',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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

export default PaymentReceived;
