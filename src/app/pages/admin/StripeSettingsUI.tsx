"use client";

import { useState, useEffect, useTransition } from "react";
import { Button, Badge, RadioGroup, ToggleSwitch, TextInput } from "@/design-system";
import {
  createConnectedAccount,
  getOnboardingLink,
  checkOnboardingStatus,
  updateFeeConfig,
  updateDepositConfig,
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
  const [isFeeSaving, startFeeTransition] = useTransition();
  const [isDepositSaving, startDepositTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [onboardingMessage, setOnboardingMessage] = useState<string | null>(
    null,
  );
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);

  // Fee config state
  const [feeBps, setFeeBps] = useState(stripeStatus.platformFeeBps);
  const [feeModel, setFeeModel] = useState(stripeStatus.feeModel);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);

  // Deposit config state
  const [depositEnabled, setDepositEnabled] = useState(
    stripeStatus.defaultDepositBps !== null,
  );
  const [depositBps, setDepositBps] = useState(
    stripeStatus.defaultDepositBps ?? 5000,
  );
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleSaveFee = () => {
    setFeeError(null);
    setFeeSuccess(null);
    startFeeTransition(async () => {
      const result = await updateFeeConfig(orgId, feeBps, feeModel);
      if (result.success) {
        setFeeSuccess("Fee configuration saved");
      } else {
        setFeeError(result.error ?? "Failed to save fee config");
      }
    });
  };

  const handleSaveDeposit = () => {
    setDepositError(null);
    setDepositSuccess(null);
    startDepositTransition(async () => {
      const result = await updateDepositConfig(
        orgId,
        depositEnabled ? depositBps : null,
      );
      if (result.success) {
        setDepositSuccess("Deposit configuration saved");
      } else {
        setDepositError(result.error ?? "Failed to save deposit config");
      }
    });
  };

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

      {stripeStatus.hasAccount && stripeStatus.onboardingComplete && (
        <>
          {/* Fee Configuration */}
          <div className="stripe-config-section">
            <h3 className="stripe-config-heading">Platform Fee</h3>
            <p className="stripe-config-description">
              Set the fee percentage charged on each order.
            </p>

            <div className="stripe-config-field">
              <TextInput
                label="Fee percentage"
                value={String(feeBps / 100)}
                onChange={(e) => {
                  const val = Math.round(parseFloat(e.target.value) * 100);
                  if (!isNaN(val) && val >= 0 && val <= 5000) setFeeBps(val);
                }}
                placeholder="5"
                helperText={`${feeBps} basis points`}
                size="md"
              />
            </div>

            <div className="stripe-config-field">
              <RadioGroup
                name="feeModel"
                label="Fee model"
                value={feeModel}
                onChange={(val) => setFeeModel(val)}
                options={[
                  {
                    value: "customer",
                    label: "Customer pays",
                    description: "Fee added to customer total",
                  },
                  {
                    value: "vendor",
                    label: "Vendor absorbs",
                    description: "Fee deducted from vendor payout",
                  },
                  {
                    value: "split",
                    label: "Split",
                    description: "Fee split between customer and vendor",
                  },
                ]}
              />
            </div>

            <Button
              variant="primary"
              onClick={handleSaveFee}
              disabled={isFeeSaving}
            >
              {isFeeSaving ? "Saving..." : "Save Fee Config"}
            </Button>

            {feeSuccess && <p className="stripe-success">{feeSuccess}</p>}
            {feeError && <p className="stripe-error">{feeError}</p>}
          </div>

          {/* Deposit Configuration */}
          <div className="stripe-config-section">
            <h3 className="stripe-config-heading">Deposit</h3>
            <p className="stripe-config-description">
              Require an upfront deposit when customers place orders.
            </p>

            <div className="stripe-config-field">
              <ToggleSwitch
                label="Require deposit"
                description="Customers pay a percentage upfront"
                checked={depositEnabled}
                onChange={(checked) => setDepositEnabled(checked)}
              />
            </div>

            {depositEnabled && (
              <div className="stripe-config-field">
                <TextInput
                  label="Deposit percentage"
                  value={String(depositBps / 100)}
                  onChange={(e) => {
                    const val = Math.round(parseFloat(e.target.value) * 100);
                    if (!isNaN(val) && val >= 0 && val <= 10000)
                      setDepositBps(val);
                  }}
                  placeholder="50"
                  helperText={`${depositBps} basis points`}
                  size="md"
                />
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleSaveDeposit}
              disabled={isDepositSaving}
            >
              {isDepositSaving ? "Saving..." : "Save Deposit Config"}
            </Button>

            {depositSuccess && (
              <p className="stripe-success">{depositSuccess}</p>
            )}
            {depositError && <p className="stripe-error">{depositError}</p>}
          </div>
        </>
      )}

      <div className="stripe-back-link">
        <a href="/admin">← Back to Admin</a>
      </div>
    </div>
  );
}
