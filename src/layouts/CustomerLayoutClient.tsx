"use client";

import { useMemo, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { CommandBar } from "@/components/CommandBar";
import { CommandReview } from "@/components/CommandReview";
import { QueryResultOverlay } from "@/components/QueryResultOverlay";
import { executeMcpTool } from "@/api/mcp-tool-call";
import type { User } from "@/db";
import type { VoiceCommandResult } from "@/api/voice-tools";
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
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(null);
  const [queryResult, setQueryResult] = useState<VoiceCommandResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleCommandResult = useCallback((result: VoiceCommandResult) => {
    if (result.reviewType === "read-only") {
      setQueryResult(result);
    } else {
      setCommandResult(result);
    }
  }, []);

  const handleReviewSave = useCallback(async (intent: string, data: Record<string, unknown>) => {
    const { rawTranscript, _original, ...toolArgs } = data;
    const result = await executeMcpTool(csrfToken, intent, toolArgs);
    if (!result.success) {
      throw new Error(result.error || `Failed to execute ${intent}`);
    }
    setCommandResult(null);
    showToast(intent === "create_order" ? "Order placed!" : "Done!");
    window.location.reload();
  }, [showToast, csrfToken]);

  const handleReviewCancel = useCallback(() => {
    setCommandResult(null);
  }, []);

  const handleReviewRetry = useCallback(() => {
    setCommandResult(null);
  }, []);

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

      {user && (
        <>
          <CommandBar onResult={handleCommandResult} hintContext="customer" />
          {commandResult && (
            <CommandReview
              result={commandResult}
              onSave={handleReviewSave}
              onCancel={handleReviewCancel}
              onRetry={handleReviewRetry}
              mode="customer"
            />
          )}
          {queryResult && (
            <QueryResultOverlay
              result={queryResult}
              onDismiss={() => setQueryResult(null)}
            />
          )}
        </>
      )}
      {toast && <div className="cr-toast">{toast}</div>}
    </div>
  );
}
