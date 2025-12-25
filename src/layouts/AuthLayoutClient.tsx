"use client";

import "./AuthLayout.css";

export function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <header className="auth-header">
          <a href="/" className="auth-logo">
            <span className="auth-logo-text">Evan's Fresh Catch</span>
          </a>
        </header>

        <main className="auth-main">{children}</main>

        <footer className="auth-footer">
          <a href="/" className="auth-footer-link">
            ← Back to Home
          </a>
        </footer>
      </div>
    </div>
  );
}
