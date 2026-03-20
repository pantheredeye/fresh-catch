/**
 * Shared "access denied" error for admin pages.
 * Uses error-card CSS classes from AdminLayout.css.
 */
export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">🔒</div>
        <h1 className="error-title">Admin Access Required</h1>
        <p className="error-description">
          {message || "You don't have permission to access admin tools."}
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
