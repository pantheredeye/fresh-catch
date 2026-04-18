"use client";

import { UserMenu } from "./UserMenu";
import type { User } from "@/db";
import "./Header.css";

interface HeaderProps {
  user: User | null;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    role: string;
  } | null;
  browsingOrganization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variant?: "customer" | "admin" | "auth";
  csrfToken?: string;
}

export function Header({
  user,
  currentOrganization,
  browsingOrganization,
  variant = "customer",
  csrfToken,
}: HeaderProps) {
  // Auth variant: centered logo only
  if (variant === "auth") {
    return (
      <header className="unified-header unified-header--auth">
        <div className="unified-header__content content-wrapper">
          <a href="/" className="unified-header__logo">
            <span className="unified-header__logo-text">Fresh Catch</span>
          </a>
        </div>
      </header>
    );
  }

  // Admin variant: logo + ADMIN badge + UserMenu
  if (variant === "admin") {
    return (
      <header className="unified-header unified-header--admin">
        <div className="unified-header__content content-wrapper">
          <div className="unified-header__left">
            <a href="/" className="unified-header__logo">
              <span className="unified-header__logo-text">
                {currentOrganization?.name ?? "Admin"}
              </span>
            </a>
            <div className="admin-badge">ADMIN</div>
          </div>
          <div className="unified-header__right">
            <UserMenu user={user} currentOrganization={currentOrganization} csrfToken={csrfToken} />
          </div>
        </div>
      </header>
    );
  }

  // Customer variant (default): logo + Order + UserMenu
  return (
    <header className="unified-header unified-header--customer">
      <div className="unified-header__content content-wrapper">
        <a href="/" className="unified-header__logo">
          <span className="unified-header__logo-text">{browsingOrganization?.name ?? currentOrganization?.name ?? "Fresh Catch"}</span>
        </a>
        <div className="unified-header__actions">
          <a href={browsingOrganization?.slug ? `/orders/new?b=${browsingOrganization.slug}` : "/orders/new"} className="order-button">
            + Order
          </a>
          <UserMenu user={user} currentOrganization={currentOrganization} browsingOrganization={browsingOrganization} csrfToken={csrfToken} />
        </div>
      </div>
    </header>
  );
}
