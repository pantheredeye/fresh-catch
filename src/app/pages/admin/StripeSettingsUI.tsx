"use client";

import { useState, useEffect, useTransition } from "react";
import { Button, Badge } from "@/design-system";
import {
  createConnectedAccount,
  getOnboardingLink,
  checkOnboardingStatus,
} from "./stripe-functions";
import "./admin.css";

type StripeStatus = {
  hasAccount: boolean;
  onboardingComplete: boolean;
  accountId: string | null;
  platformFeeBps: number;
  defaultDepositBps: number | null;
  feeModel: string;
};

export function StripeSettingsUI({
  orgId,
  stripeStatus,
  onboardingParam,
}: {
  orgId: string;
  stripeStatus: StripeStatus;
  onboardingParam: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [onboardingMessage, setOnboardingMessage] = useState<string | null>(
    null,
  );
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);

  useEffect(() => {
    if (!onboardingParam) return;

    if (onboardingParam === "complete") {
      startTransition(async () => {
        const result = await checkOnboardingStatus(orgId);
        if (result.success && result.onboardingComplete) {
          setOnboardingSuccess(true);
          setOnboardingMessage("Stripe setup complete! You can now accept payments.");
        } else if (result.success) {
          setOnboardingMessage(
            "Stripe setup is not yet complete. Please continue setup to finish verification.",
          );
        } else {
          setError(result.error ?? "Failed to check onboarding status");
        }
        // Clean URL params
        window.history.replaceState({}, "", window.location.pathname);
      });
    } else if (onboardingParam === "refresh") {
      startTransition(async () => {
        const link = await getOnboardingLink(orgId);
        if (link.success && link.url) {
          window.location.href = link.url;
        } else {
          setError(link.error ?? "Failed to generate new onboarding link");
        }
      });
    }
  }, [onboardingParam, orgId]);

  const handleConnect = () => {
    setError(null);
    startTransition(async () => {
      const result = await createConnectedAccount(orgId);
      if (!result.success) {
        setError(result.error ?? "Failed to create account");
        return;
      }
      // Account created, get onboarding link and redirect
      const link = await getOnboardingLink(orgId);
      if (link.success && link.url) {
        window.location.href = link.url;
      } else {
        setError(link.error ?? "Failed to get onboarding link");
      }
    });
  };

  const handleContinueSetup = () => {
    setError(null);
    startTransition(async () => {
      const link = await getOnboardingLink(orgId);
      if (link.success && link.url) {
        window.location.href = link.url;
      } else {
        setError(link.error ?? "Failed to get onboarding link");
      }
    });
  };

  return (
    <div className="config-page">
      <div className="config-header">
        <h1 className="config-title">Stripe Settings</h1>
        <p className="config-subtitle">
          Manage your payment processing connection
        </p>
      </div>

      <div className="stripe-status-card">
        {!stripeStatus.hasAccount && (
          <>
            <div className="stripe-status-icon">💳</div>
            <h2 className="stripe-status-heading">Connect Stripe Account</h2>
            <p className="stripe-status-description">
              Connect your Stripe account to start accepting payments from
              customers.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleConnect}
              disabled={isPending}
            >
              {isPending ? "Connecting..." : "Connect Stripe Account"}
            </Button>
          </>
        )}

        {stripeStatus.hasAccount && !stripeStatus.onboardingComplete && (
          <>
            <div className="stripe-status-icon">⏳</div>
            <h2 className="stripe-status-heading">Setup In Progress</h2>
            <p className="stripe-status-description">
              Your Stripe account has been created but setup isn't complete yet.
              Continue to finish verification.
            </p>
            {stripeStatus.accountId && (
              <p className="stripe-account-id">
                Account: {stripeStatus.accountId}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleContinueSetup}
              disabled={isPending}
            >
              {isPending ? "Loading..." : "Continue Setup"}
            </Button>
          </>
        )}

        {stripeStatus.hasAccount && stripeStatus.onboardingComplete && (
          <>
            <div className="stripe-status-icon stripe-status-icon--connected">
              ✓
            </div>
            <div className="stripe-connected-header">
              <h2 className="stripe-status-heading">Stripe Connected</h2>
              <Badge variant="mint">Connected</Badge>
            </div>
            {stripeStatus.accountId && (
              <p className="stripe-account-id">
                Account: {stripeStatus.accountId}
              </p>
            )}
          </>
        )}

        {onboardingMessage && (
          <p
            className={
              onboardingSuccess ? "stripe-success" : "stripe-pending"
            }
          >
            {onboardingMessage}
          </p>
        )}
        {error && <p className="stripe-error">{error}</p>}
      </div>

      <div className="stripe-back-link">
        <a href="/admin">← Back to Admin</a>
      </div>
    </div>
  );
}
