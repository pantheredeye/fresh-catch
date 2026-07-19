"use client";

import { useEffect, useState } from "react";
import { Container, Card } from "@/design-system";
import { AuthCard, AuthSuccess } from "./AuthCard";

/**
 * Full-page login. A thin host around AuthCard: reads ?invite / ?b from the
 * URL, and on success does a HARD navigation to the server-computed
 * destination (the auth cookie just changed; in-place RSC state is stale).
 */
export function Login({
  navigate = "redirect",
  heading = "Sign in",
  subtext = "Enter your email and we'll send you a code. New here? Same two steps.",
}: {
  navigate?: "redirect" | "reload";
  heading?: string;
  subtext?: string;
}) {
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInviteToken(params.get("invite"));
  }, []);

  const handleSuccess = (result: AuthSuccess) => {
    if (navigate === "reload") {
      window.location.reload();
    } else {
      window.location.assign(result.redirectTo);
    }
  };

  return (
    <Container size="sm">
      <Card variant="centered" maxWidth="450px">
        <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div>
            <h1
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-display)",
                margin: "0 0 var(--space-xs) 0",
              }}
            >
              {heading}
            </h1>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", margin: 0 }}>
              {subtext}
            </p>
          </div>
          <AuthCard inviteToken={inviteToken} onSuccess={handleSuccess} />
        </div>
      </Card>
    </Container>
  );
}
