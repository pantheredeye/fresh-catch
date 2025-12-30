import { RequestInfo } from "rwsdk/worker";
import { JoinUI } from "./JoinUI";
import { env } from "cloudflare:workers";
import { Container, Card } from "@/design-system";

export function JoinPage(requestInfo: RequestInfo) {
  const url = new URL(requestInfo.request.url);
  const code = url.searchParams.get('code');
  const { ctx } = requestInfo;

  // If not logged in and have a code, ask to login first
  if (!ctx.user && code) {
    return <PleaseLoginFirst />;
  }

  // If no code, show code entry form
  if (!code) {
    return <JoinUI />;
  }

  // Server-side validation
  const isValidCode = code === env.ADMIN_CODE || code === env.MANAGER_CODE;

  if (!isValidCode) {
    return <InvalidCodeError isLoggedIn={!!ctx.user} />;
  }

  const role = code === env.ADMIN_CODE ? "owner" : "manager";
  const roleLabel = role === "owner" ? "Owner" : "Manager";
  const isLoggedIn = !!ctx.user;

  return <JoinUI code={code} role={role} roleLabel={roleLabel} isLoggedIn={isLoggedIn} />;
}

function PleaseLoginFirst() {
  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          <h1 style={{
            fontSize: '24px',
            color: 'var(--deep-navy)',
            marginBottom: 'var(--space-md)'
          }}>
            Join Fresh Catch Team
          </h1>
          <p style={{
            color: 'var(--cool-gray)',
            marginBottom: 'var(--space-lg)'
          }}>
            Please login or register first, then come back with your invite code.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'var(--ocean-blue)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            Go to Login
          </a>
        </div>
      </Card>
    </Container>
  );
}

function InvalidCodeError({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          <h1 style={{
            fontSize: '24px',
            color: 'var(--deep-navy)',
            marginBottom: 'var(--space-md)'
          }}>
            Invalid Invite Code
          </h1>
          <p style={{
            color: 'var(--cool-gray)',
            marginBottom: 'var(--space-lg)'
          }}>
            The invite code in your URL is invalid or missing.
          </p>
          <a
            href={isLoggedIn ? "/" : "/login"}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'var(--ocean-blue)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            {isLoggedIn ? "Go to Home" : "Go to Login"}
          </a>
        </div>
      </Card>
    </Container>
  );
}
