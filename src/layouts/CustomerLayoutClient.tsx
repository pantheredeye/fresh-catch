"use client";

import { Header } from "@/components/Header";
import type { User } from "@/db";
import { CustomerFooter } from "./CustomerFooter";
import "./CustomerLayout.css";
import "@/components/UserMenu.css";
import "@/design-system/tokens.css";

export function CustomerLayoutClient({
  user,
  currentOrganization,
  browsingOrganization,
  csrfToken,
  children,
}: {
  user: User | null;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    role: string;
  } | null;
  browsingOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  csrfToken: string;
  children: React.ReactNode;
}) {
  return (
    <div className="customer-layout">
      <Header
        variant="customer"
        user={user}
        currentOrganization={currentOrganization}
        browsingOrganization={browsingOrganization}
        csrfToken={csrfToken}
      />

      <main className="customer-main">{children}</main>

      <CustomerFooter />
    </div>
  );
}
