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
          Your account isn't linked to a business. Please complete business setup first.
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
