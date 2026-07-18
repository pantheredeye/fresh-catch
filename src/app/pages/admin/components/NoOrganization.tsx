/**
 * Shared "no organization context" error for admin pages.
 * Uses error-card CSS classes from AdminLayout.css.
 */
export function NoOrganization() {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">⚠️</div>
        <h1 className="error-title">No Business Found</h1>
        <p className="error-description">
          Your account isn't linked to a business. Ask the business owner to
          send you an invite.
        </p>
        <div className="error-actions">
          <a href="/" className="error-secondary-link">
            Go to Homepage →
          </a>
        </div>
      </div>
    </div>
  );
}
