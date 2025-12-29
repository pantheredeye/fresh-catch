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

interface OrderConfirmedProps {
  customerName: string;
  orderNumber: number;
  items: string;
  price: string;
  adminNotes?: string;
  preferredDate?: string;
  businessName: string;
}

export function OrderConfirmed({
  customerName,
  orderNumber,
  items,
  price,
  adminNotes,
  preferredDate,
  businessName,
}: OrderConfirmedProps) {
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

            <Section style={priceBox}>
              <Text style={priceLabel}>Total Price</Text>
              <Text style={priceAmount}>{price}</Text>
            </Section>

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

          <Text style={text}>
            Please bring payment when you pick up your order. We accept cash, Venmo, and Zelle.
          </Text>

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

const priceBox = {
  background: '#00d9b1',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
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
