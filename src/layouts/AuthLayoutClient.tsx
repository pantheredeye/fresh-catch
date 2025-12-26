"use client";

import { Header } from "@/components/Header";
import "./AuthLayout.css";

export function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <Header variant="auth" user={null} currentOrganization={null} />

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
