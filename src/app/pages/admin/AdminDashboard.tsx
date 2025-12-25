import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { AdminDashboardUI } from "./AdminDashboardUI";
import { Login } from "../user/Login";
import { Container } from "@/design-system";

/**
 * AdminDashboard - Server component for /admin landing page
 *
 * DESIGN DECISIONS:
 *
 * 1. **Inline Login vs Redirect** (Decision: Inline)
 *    - Context: Unauthenticated users hitting /admin should see login immediately
 *    - Rationale: Less bouncing around, clearer UX ("You're on the admin page")
 *    - Implementation: Render Login component directly when not authenticated
 *
 * 2. **Role-Based Access Control** (Decision: Server-side check)
 *    - Context: Only users with admin role (owner/manager) can access dashboard
 *    - Rationale: Security at server level, clear separation of concerns
 *    - Implementation: Check hasAdminAccess(ctx) before rendering dashboard
 *
 * 3. **Minimal Dashboard Design** (Decision: Navigation cards only)
 *    - Context: Control center for daily operations (inventory/orders coming)
 *    - Rationale: Industrial design principles - clarity over decoration
 *    - Implementation: Two equal-priority cards, mobile-first responsive grid
 */
export function AdminDashboard({ ctx }: RequestInfo) {
  // Not logged in - show inline login
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  // Logged in but not admin - show access denied
  if (!hasAdminAccess(ctx)) {
    return (
      <Container>
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">🔒</div>
            <h1 className="error-title">Admin Access Required</h1>
            <p className="error-description">
              You don't have permission to access admin tools.
            </p>
            <div className="error-actions">
              <a href="/" className="error-secondary-link">
                ← Back to Customer Portal
              </a>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // Admin user - show dashboard
  return <AdminDashboardUI ctx={ctx} />;
}
