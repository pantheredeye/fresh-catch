import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

interface ChatReplyNotificationProps {
  customerName: string;
  vendorName: string;
  messagePreview: string;
  chatUrl: string;
  businessName: string;
}

export function ChatReplyNotification({
  customerName,
  vendorName,
  messagePreview,
  chatUrl,
  businessName,
}: ChatReplyNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You have a new reply!</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            {vendorName} from {businessName} just replied to your message.
          </Text>

          <Section style={messageBox}>
            <Text style={previewLabel}>{vendorName} wrote:</Text>
            <Text style={previewText}>"{messagePreview}"</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={chatUrl}>
              Continue the conversation
            </Button>
          </Section>

          <Text style={text}>
            We're here to help — feel free to reply anytime.
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

const messageBox = {
  background: '#f8fafc',
  border: '2px solid #0066cc',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 40px',
};

const previewLabel = {
  color: '#1a2b3d',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const previewText = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 40px',
};

const ctaButton = {
  backgroundColor: '#0066cc',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 48px',
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

export default ChatReplyNotification;
