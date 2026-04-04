"use client";

import { useMemo } from "react";
import { Header } from "@/components/Header";
import type { User } from "@/db";
import { CustomerFooter } from "./CustomerFooter";
import "./CustomerLayout.css";
import "@/components/UserMenu.css";
import "@/design-system/tokens.css";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

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
    accentColor: string | null;
  } | null;
  csrfToken: string;
  children: React.ReactNode;
}) {
  const accentStyle = useMemo(() => {
    const hex = browsingOrganization?.accentColor;
    if (!hex) return undefined;
    const rgb = hexToRgb(hex);
    if (!rgb) return undefined;
    return {
      "--vendor-accent": hex,
      "--vendor-accent-soft": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      "--vendor-hero-bg": `linear-gradient(135deg, ${hex}, rgba(0, 169, 150, 0.8))`,
    } as React.CSSProperties;
  }, [browsingOrganization?.accentColor]);

  return (
    <div className="customer-layout" data-surface="vendor" data-vendor={browsingOrganization?.slug ?? currentOrganization?.slug ?? undefined} style={accentStyle}>
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
