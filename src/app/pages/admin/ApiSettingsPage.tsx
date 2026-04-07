import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { ApiSettingsUI } from "./ApiSettingsUI";
import { NotAuthenticated, AccessDenied, NoOrganization } from "./components";

export async function ApiSettingsPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const org = await db.organization.findUnique({
    where: { id: ctx.currentOrganization.id },
    select: {
      id: true,
      apiKeyPrefix: true,
    },
  });

  if (!org) {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">!</div>
          <h1 className="error-title">Organization Not Found</h1>
          <p className="error-description">Could not load organization data.</p>
          <div className="error-actions">
            <a href="/admin" className="error-secondary-link">Back to Admin</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ApiSettingsUI
      orgId={org.id}
      existingKeyPrefix={org.apiKeyPrefix}
      csrfToken={ctx.session!.csrfToken}
    />
  );
}
