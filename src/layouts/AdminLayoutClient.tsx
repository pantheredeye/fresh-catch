"use client";

import { UserMenu } from "@/components/UserMenu";
import type { User } from "@/db";
import "./AdminLayout.css";
import "@/components/UserMenu.css";

export function AdminLayoutClient({
  user,
  currentOrganization,
  isAdmin,
  children,
}: {
  user: User | null;
  currentOrganization: {
    id: string;
    name: string;
    type: string;
    role: string;
  } | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  if (!isAdmin) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card glass-card">
          <h1>Access Denied</h1>
          <p>You don't have permission to access the admin area.</p>
          <a href="/" className="button ocean-gradient-button">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <a href="/" className="exit-admin-button" title="Back to Customer View">
              <span className="back-arrow">←</span>
              <span className="exit-text">Exit Admin</span>
            </a>
            <div className="admin-badge">ADMIN</div>
          </div>

          <div className="admin-header-right">
            <UserMenu
              user={user}
              currentOrganization={currentOrganization}
            />
          </div>
        </div>

        <nav className="admin-nav">
          <a href="/admin" className="admin-nav-item">
            Markets
          </a>
          <a href="/admin/orders" className="admin-nav-item">
            Orders
          </a>
          <a href="/admin/settings" className="admin-nav-item">
            Settings
          </a>
        </nav>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
