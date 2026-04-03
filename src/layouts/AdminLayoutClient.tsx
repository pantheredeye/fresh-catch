"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { CommandBar } from "@/components/CommandBar";
import { CommandReview } from "@/components/CommandReview";
import { AdminChatBubble, AdminChatSheet } from "@/app/pages/admin/chat";
import { publishCatch } from "@/app/pages/admin/catch/catch-functions";
import {
  createMarket,
  updateMarket,
  updateMarketCatchPreview,
} from "@/app/pages/admin/market-functions";
import type { User } from "@/db";
import type { VoiceCommandResult } from "@/api/voice-tools";
import "./AdminLayout.css";
import "@/components/UserMenu.css";
import "@/design-system/tokens.css";

function Toast({ message }: { message: string }) {
  return <div className="cr-toast">{message}</div>;
}

export function AdminLayoutClient({
  user,
  currentOrganization,
  isAdmin,
  isOwner,
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
  isAdmin: boolean;
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleCommandResult = useCallback((result: VoiceCommandResult) => {
    setCommandResult(result);
  }, []);

  const handleReviewSave = useCallback(async (intent: string, data: Record<string, unknown>) => {
    switch (intent) {
      case "update_catch": {
        const content = {
          headline: data.headline as string,
          items: data.items as { name: string; note: string }[],
          summary: data.summary as string,
        };
        const result = await publishCatch(content, (data.rawTranscript as string) || "");
        if (!result.success) throw new Error(result.error || "Failed to publish catch");
        break;
      }
      case "create_market": {
        await createMarket({
          name: data.name as string,
          schedule: (data.schedule as string) || "",
          locationDetails: (data.locationDetails as string) || null,
          customerInfo: (data.customerInfo as string) || null,
          active: (data.active as boolean) ?? true,
          catchPreview: (data.catchPreview as string) || null,
          rawTranscript: (data.rawTranscript as string) || null,
        });
        break;
      }
      case "create_popup": {
        await createMarket({
          name: data.name as string,
          schedule: (data.schedule as string) || "",
          type: "popup",
          expiresAt: (data.expiresAt as string) || null,
          locationDetails: (data.locationDetails as string) || null,
          customerInfo: (data.customerInfo as string) || null,
          active: (data.active as boolean) ?? true,
          catchPreview: (data.catchPreview as string) || null,
          notes: (data.notes as string) || null,
          rawTranscript: (data.rawTranscript as string) || null,
        });
        break;
      }
      case "update_market": {
        const { marketId, rawTranscript, ...fields } = data;
        await updateMarket(marketId as string, {
          ...fields,
          rawTranscript: (rawTranscript as string) || null,
        } as Parameters<typeof updateMarket>[1]);
        break;
      }
      case "update_market_catch": {
        await updateMarketCatchPreview(
          data.marketId as string,
          data.catchPreview as string,
          (data.rawTranscript as string) || null,
        );
        break;
      }
      default:
        throw new Error(`Unknown intent: ${intent}`);
    }
    setCommandResult(null);
    showToast("Saved!");
    // Trigger page refresh
    window.location.reload();
  }, [showToast]);

  const handleReviewCancel = useCallback(() => {
    setCommandResult(null);
  }, []);
  const handleReviewRetry = useCallback(() => {
    setCommandResult(null);
    // CommandBar will re-open on next mic tap
  }, []);

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
        {/* Exit Admin section - above unified header */}
        <div className="admin-exit-section">
          <div className="admin-exit-content content-wrapper">
            <a href="/" className="exit-admin-button" title="Back to Customer View">
              <span className="back-arrow">←</span>
              <span className="exit-text">Exit Admin</span>
            </a>
          </div>
        </div>

        {/* Unified Header */}
        <Header
          variant="admin"
          user={user}
          currentOrganization={currentOrganization}
        />

        {/* Admin nav tabs - below unified header */}
        <nav className="admin-nav content-wrapper">
          <a href="/admin" className="admin-nav-item">
            Markets
          </a>
          <a href="/admin/orders" className="admin-nav-item">
            Orders
          </a>
          {isOwner && (
            <a href="/admin/team" className="admin-nav-item">
              Team
            </a>
          )}
          <a href="/admin/settings/stripe" className="admin-nav-item">
            Settings
          </a>
        </nav>
      </header>

      <main className="admin-main content-wrapper">{children}</main>
      <CommandBar onResult={handleCommandResult} />
      {commandResult && (
        <CommandReview
          result={commandResult}
          onSave={handleReviewSave}
          onCancel={handleReviewCancel}
          onRetry={handleReviewRetry}
        />
      )}
      {toast && <Toast message={toast} />}
      <AdminChatBubble organizationId={currentOrganization?.id} onClick={() => setChatOpen(true)} />
      {currentOrganization && (
        <AdminChatSheet
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          organizationId={currentOrganization.id}
        />
      )}
    </div>
  );
}
