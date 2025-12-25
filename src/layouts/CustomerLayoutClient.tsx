"use client";

import { UserMenu } from "@/components/UserMenu";
import type { User } from "@/db";
import "./CustomerLayout.css";
import "@/components/UserMenu.css";

export function CustomerLayoutClient({
  user,
  currentOrganization,
  children,
}: {
  user: User | null;
  currentOrganization: {
    id: string;
    name: string;
    type: string;
    role: string;
  } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="customer-layout">
      <header className="customer-header">
        <div className="header-content">
          <a href="/" className="business-name">
            <span className="business-name-text">Evan's Fresh Catch</span>
          </a>

          <div className="header-actions">
            <UserMenu user={user} currentOrganization={currentOrganization} />
          </div>
        </div>
      </header>

      <main className="customer-main">{children}</main>
    </div>
  );
}
