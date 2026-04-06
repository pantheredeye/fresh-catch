import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
} from '@react-email/components';

interface OtpVerificationProps {
  code: string;
  magicUrl: string;
}

export function OtpVerification({ code, magicUrl }: OtpVerificationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in to Fresh Catch</Heading>

          <Section style={buttonSection}>
            <Link href={magicUrl} style={buttonStyle}>
              Sign In to Fresh Catch
            </Link>
          </Section>

          <Text style={dividerText}>Or enter this code:</Text>

          <Section style={codeSection}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={text}>
            Expires in 10 minutes.
          </Text>

          <Text style={webOtpText}>
            @market.digitalglue.dev #{code}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If you didn't request this, ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 40px',
};

const buttonStyle = {
  display: 'inline-block',
  width: '100%',
  maxWidth: '320px',
  backgroundColor: '#0066cc',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '16px',
  borderRadius: '8px',
  boxSizing: 'border-box' as const,
};

const dividerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 40px 16px',
  textAlign: 'center' as const,
};

const text = {
  color: '#64748b',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const codeSection = {
  textAlign: 'center' as const,
  margin: '0 40px 24px',
  background: '#f8fafc',
  border: '2px solid #0066cc',
  borderRadius: '12px',
  padding: '24px',
};

const codeText = {
  color: '#1a2b3d',
  fontSize: '36px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
};

const webOtpText = {
  color: '#a0aec0',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '8px 40px 0',
  fontFamily: 'monospace',
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

export default OtpVerification;
