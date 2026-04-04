import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess, isOwner } from "@/utils/permissions";
import { StripeSettingsUI } from "./StripeSettingsUI";
import { NotAuthenticated, AccessDenied, NoOrganization } from "./components";

export async function StripeSettingsPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

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

  const url = new URL(requestInfo.request.url);
  const onboardingParam = url.searchParams.get("onboarding");

  return (
    <StripeSettingsUI
      orgId={org.id}
      csrfToken={ctx.session!.csrfToken}
      stripeStatus={stripeStatus}
      onboardingParam={onboardingParam}
      canEditFees={isOwner(ctx)}
    />
  );
}
