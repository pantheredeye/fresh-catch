import { RequestInfo } from "rwsdk/worker";
import { JoinUI } from "./JoinUI";
import { env } from "cloudflare:workers";
import { Container, Card, Button } from "@/design-system";

export function JoinPage(requestInfo: RequestInfo) {
  const url = new URL(requestInfo.request.url);
  const code = url.searchParams.get('code');

  // Server-side validation
  const isValidCode = code && (
    code === env.ADMIN_CODE || code === env.MANAGER_CODE
  );

  if (!isValidCode) {
    return <InvalidCodeError />;
  }

  const role = code === env.ADMIN_CODE ? "owner" : "manager";
  const roleLabel = role === "owner" ? "Owner" : "Manager";

  return <JoinUI code={code} role={role} roleLabel={roleLabel} />;
}

function InvalidCodeError() {
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
          <Button
            variant="primary"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </Button>
        </div>
      </Card>
    </Container>
  );
}
