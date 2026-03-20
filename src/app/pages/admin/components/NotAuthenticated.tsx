/**
 * Shared "not logged in" error for admin pages.
 * Uses error-card CSS classes from AdminLayout.css.
 */
export function NotAuthenticated() {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">🔒</div>
        <h1 className="error-title">Login Required</h1>
        <p className="error-description">
          Please log in to access this page.
        </p>
        <div className="error-actions">
          <a href="/login" className="error-secondary-link">
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}
