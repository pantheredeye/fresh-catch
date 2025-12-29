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

interface OrderConfirmationProps {
  customerName: string;
  orderNumber: number;
  items: string;
  preferredDate?: string;
  notes?: string;
  businessName: string;
}

export function OrderConfirmation({
  customerName,
  orderNumber,
  items,
  preferredDate,
  notes,
  businessName,
}: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Received!</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            We've received your order and will get back to you soon with pricing and pickup details.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>

            <Text style={label}>Items Requested:</Text>
            <Text style={orderDetails}>{items}</Text>

            {preferredDate && (
              <>
                <Text style={label}>Preferred Pickup Date:</Text>
                <Text style={orderDetails}>
                  {new Date(preferredDate).toLocaleDateString()}
                </Text>
              </>
            )}

            {notes && (
              <>
                <Text style={label}>Your Notes:</Text>
                <Text style={orderDetails}>{notes}</Text>
              </>
            )}
          </Section>

          <Text style={text}>
            {businessName} will confirm your order soon. You'll receive another email once your order is confirmed with the final price and pickup information.
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
  border: '2px solid #0066cc',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 40px',
};

const orderNumberStyle = {
  color: '#0066cc',
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

export default OrderConfirmation;
