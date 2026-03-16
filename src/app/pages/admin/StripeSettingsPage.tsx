import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

export async function StripeSettingsPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">🔒</div>
          <h1 className="error-title">Login Required</h1>
          <p className="error-description">
            Please log in to access Stripe settings.
          </p>
          <div className="error-actions">
            <a href="/login" className="error-secondary-link">
              ← Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess(ctx)) {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">🔒</div>
          <h1 className="error-title">Admin Access Required</h1>
          <p className="error-description">
            You don't have permission to manage Stripe settings.
          </p>
          <div className="error-actions">
            <a href="/" className="error-secondary-link">
              ← Back to Customer Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!ctx.currentOrganization) {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h1 className="error-title">No Business Found</h1>
          <p className="error-description">
            Your account isn't linked to a business. Please complete business
            setup first.
          </p>
          <div className="error-actions">
            <a href="/admin/setup" className="error-secondary-link">
              Complete Business Setup →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.currentOrganization.id },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      platformFeeBps: true,
      defaultDepositBps: true,
      feeModel: true,
    },
  });

  if (!org) {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h1 className="error-title">Organization Not Found</h1>
          <p className="error-description">
            Could not load organization data.
          </p>
          <div className="error-actions">
            <a href="/admin" className="error-secondary-link">
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stripeStatus = {
    hasAccount: !!org.stripeAccountId,
    onboardingComplete: org.stripeOnboardingComplete,
    accountId: org.stripeAccountId,
    platformFeeBps: org.platformFeeBps,
    defaultDepositBps: org.defaultDepositBps,
    feeModel: org.feeModel,
  };

  // TODO: Replace with StripeSettingsUI client component when created
  return (
    <div className="admin-page">
      <h1>Stripe Settings</h1>
      <div className="admin-card">
        <h2>Connection Status</h2>
        <p>
          {stripeStatus.hasAccount
            ? stripeStatus.onboardingComplete
              ? "Connected and active"
              : "Account created — onboarding incomplete"
            : "Not connected"}
        </p>
      </div>
    </div>
  );
}
