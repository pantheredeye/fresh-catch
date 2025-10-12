import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { MarketConfigUI } from "./MarketConfigUI";
import { Container } from "@/design-system/components/Container";
import "@/admin-design-system/admin-auth.css";

/**
 * MarketConfigPage - Server component for admin market configuration
 *
 * RWSDK Pattern: Server Component + Server Functions
 * - Fetches market data directly in server component
 * - Passes data as props to client component (MarketConfigUI)
 * - Client component calls server functions for mutations
 *
 * This allows Evan to configure his markets for the 2-week rotation schedule.
 */
export async function MarketConfigPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  // Not logged in - redirect to login
  if (!ctx.user) {
    return (
      <Container>
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">🔒</div>
            <h1 className="error-title">Login Required</h1>
            <p className="error-description">
              Please log in to access market configuration.
            </p>
            <div className="error-actions">
              <a href="/login" className="error-secondary-link">
                ← Go to Login
              </a>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // Logged in but not admin
  if (!hasAdminAccess(ctx)) {
    return (
      <Container>
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">🔒</div>
            <h1 className="error-title">Admin Access Required</h1>
            <p className="error-description">
              You don't have permission to manage markets. This area is for business owners only.
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

  // No organization context (edge case)
  if (!ctx.currentOrganization) {
    return (
      <Container>
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h1 className="error-title">No Business Found</h1>
            <p className="error-description">
              Your account isn't linked to a business. Please complete business setup first.
            </p>
            <div className="error-actions">
              <a href="/admin/setup" className="error-secondary-link">
                Complete Business Setup →
              </a>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // Fetch markets directly in server component
  const markets = await db.market.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return <MarketConfigUI markets={markets} />;
}