import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { NotificationSettingsUI } from "./NotificationSettingsUI";
import { NotAuthenticated, AccessDenied, NoOrganization } from "./components";

export async function NotificationSettingsPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const org = await db.organization.findUnique({
    where: { id: ctx.currentOrganization.id },
    select: {
      id: true,
      name: true,
      notificationEmail: true,
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
    <NotificationSettingsUI
      orgId={org.id}
      orgName={org.name}
      notificationEmail={org.notificationEmail}
      csrfToken={ctx.session!.csrfToken}
    />
  );
}
