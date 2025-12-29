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

interface AdminNewOrderProps {
  orderNumber: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: string;
  preferredDate?: string;
  notes?: string;
  businessName: string;
}

export function AdminNewOrder({
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  preferredDate,
  notes,
  businessName,
}: AdminNewOrderProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 New Order Received!</Heading>
          <Text style={text}>
            A new order has been placed and is waiting for your confirmation.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>

            <Text style={label}>Customer:</Text>
            <Text style={orderDetails}>{customerName}</Text>
            {customerEmail && (
              <>
                <Text style={label}>Email:</Text>
                <Text style={orderDetails}>{customerEmail}</Text>
              </>
            )}
            {customerPhone && (
              <>
                <Text style={label}>Phone:</Text>
                <Text style={orderDetails}>{customerPhone}</Text>
              </>
            )}

            <Text style={label}>Items Requested:</Text>
            <Text style={orderDetails}>{items}</Text>

            {preferredDate && (
              <>
                <Text style={label}>Preferred Pickup Date:</Text>
                <Text style={orderDetails}>
                  {new Date(preferredDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </>
            )}

            {notes && (
              <>
                <Text style={label}>Customer Notes:</Text>
                <Text style={orderDetails}>{notes}</Text>
              </>
            )}
          </Section>

          <Section style={actionBox}>
            <Text style={actionText}>
              <strong>Next Steps:</strong>
            </Text>
            <Text style={actionText}>
              1. Review the order details<br />
              2. Check availability and determine pricing<br />
              3. Confirm the order in your admin panel
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated notification from {businessName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a2b3d',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const orderBox = {
  background: '#ffffff',
  border: '3px solid #0066cc',
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

const actionBox = {
  background: '#fff3cd',
  border: '2px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 40px',
};

const actionText = {
  color: '#1a2b3d',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '32px 0',
};

const footer = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};
