"use client";

import { Header } from "@/components/Header";
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
      <Header
        variant="customer"
        user={user}
        currentOrganization={currentOrganization}
      />

      <main className="customer-main content-wrapper">{children}</main>
    </div>
  );
}
