import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { Container, Card } from "@/design-system";
import { AcceptInviteUI } from "./AcceptInviteUI";

export async function AcceptInvitePage({ ctx, request }: RequestInfo) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return <InviteError message="No invite token provided." isLoggedIn={!!ctx.user} />;
  }

  const invite = await db.invite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.status !== "pending") {
    // If invite was accepted and user is the acceptor, show friendly "you're in" message
    if (invite?.status === "accepted" && ctx.user && invite.acceptedBy === ctx.user.id) {
      return <AlreadyMember orgName={invite.organization.name} />;
    }
    return (
      <InviteError
        message={
          invite?.status === "revoked"
            ? "This invite has been revoked."
            : invite?.status === "accepted"
            ? "This invite has already been used."
            : "This invite link is invalid."
        }
        isLoggedIn={!!ctx.user}
      />
    );
  }

  if (!ctx.user) {
    return <PleaseLoginFirst token={token} orgName={invite.organization.name} role={invite.role} />;
  }

  const roleLabel = invite.role === "owner" ? "Owner" : "Manager";

  return (
    <AcceptInviteUI
      token={token}
      orgName={invite.organization.name}
      roleLabel={roleLabel}
      inviteEmail={invite.email}
      csrfToken={ctx.session!.csrfToken}
    />
  );
}

function PleaseLoginFirst({ token, orgName, role }: { token: string; orgName: string; role: string }) {
  const roleLabel = role === "owner" ? "Owner" : "Manager";
  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
          <h1 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-md)" }}>
            Join {orgName}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-sm)" }}>
            You've been invited to join as <strong>{roleLabel}</strong>.
          </p>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-lg)" }}>
            Sign in or create an account to accept.
          </p>
          <a
            href={`/login?invite=${encodeURIComponent(token)}`}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "var(--color-action-primary)",
              color: "var(--color-text-inverse)",
              textDecoration: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--font-size-md)",
            }}
          >
            Continue
          </a>
        </div>
      </Card>
    </Container>
  );
}

function AlreadyMember({ orgName }: { orgName: string }) {
  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
          <h1 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-md)" }}>
            You're already in!
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-lg)" }}>
            You're a member of <strong>{orgName}</strong>.
          </p>
          <a
            href="/admin"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "var(--color-action-primary)",
              color: "var(--color-text-inverse)",
              textDecoration: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--font-size-md)",
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </Card>
    </Container>
  );
}

function InviteError({ message, isLoggedIn }: { message: string; isLoggedIn: boolean }) {
  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
          <h1 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)", marginBottom: "var(--space-md)" }}>
            Invalid Invite
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-lg)" }}>
            {message}
          </p>
          <a
            href={isLoggedIn ? "/" : "/login"}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "var(--color-action-primary)",
              color: "var(--color-text-inverse)",
              textDecoration: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--font-size-md)",
            }}
          >
            {isLoggedIn ? "Go to Home" : "Go to Login"}
          </a>
        </div>
      </Card>
    </Container>
  );
}
