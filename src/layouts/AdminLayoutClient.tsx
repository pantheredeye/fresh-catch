"use client";

import { useState, useCallback, useEffect } from "react";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Header } from "@/components/Header";
import { CommandBar } from "@/components/CommandBar";
import { CommandReview } from "@/components/CommandReview";
import { QueryResultOverlay } from "@/components/QueryResultOverlay";
import { AdminChatBubble, AdminChatSheet } from "@/app/pages/admin/chat";
import { InboxProvider } from "@/inbox/useInbox";
import { getPendingOrderCount } from "@/app/pages/admin/order-functions";
import { NotificationBadge } from "@/design-system";
import { executeMcpTool } from "@/api/mcp-tool-call";
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
  isAdmin: boolean;
  isOwner: boolean;
  csrfToken: string;
  children: React.ReactNode;
}) {
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(null);
  const [queryResult, setQueryResult] = useState<VoiceCommandResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    const fetchCount = async () => {
      try {
        const count = await Promise.race([
          getPendingOrderCount(currentOrganization.id),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8_000)),
        ]);
        setPendingOrderCount(count);
      } catch { /* noop */ }
    };
    const delay = setTimeout(fetchCount, 2_000);
    const interval = setInterval(fetchCount, 30_000);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, [currentOrganization?.id]);

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
    // Strip rawTranscript and _original from args — not part of MCP tool schemas
    const { rawTranscript, _original, ...toolArgs } = data;
    const result = await executeMcpTool(csrfToken, intent, toolArgs, currentOrganization?.id);
    if (!result.success) {
      throw new Error(result.error || `Failed to execute ${intent}`);
    }
    setCommandResult(null);
    showToast("Saved!");
    window.location.reload();
  }, [showToast, csrfToken, currentOrganization?.id]);

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

  const adminContent = (
    <div className="admin-layout" data-surface="admin">
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
          csrfToken={csrfToken}
        />

        {/* Admin nav tabs - below unified header */}
        <AdminNav isOwner={isOwner} pendingOrderCount={pendingOrderCount} />
      </header>

      <main className="admin-main content-wrapper">{children}</main>
      <CommandBar onResult={handleCommandResult} targetOrgId={currentOrganization?.id} isOpen={commandBarOpen} onClose={() => setCommandBarOpen(false)} />
      {commandResult && (
        <CommandReview
          result={commandResult}
          onSave={handleReviewSave}
          onCancel={handleReviewCancel}
          onRetry={handleReviewRetry}
        />
      )}
      {queryResult && (
        <QueryResultOverlay
          result={queryResult}
          onDismiss={() => setQueryResult(null)}
        />
      )}
      {toast && <Toast message={toast} />}
      <AdminChatBubble organizationId={currentOrganization?.id} onChatClick={() => setChatOpen(true)} onVoiceClick={() => setCommandBarOpen(true)} />
      {currentOrganization && (
        <AdminChatSheet
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          organizationId={currentOrganization.id}
        />
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      {currentOrganization ? (
        <InboxProvider organizationId={currentOrganization.id}>
          {adminContent}
        </InboxProvider>
      ) : (
        adminContent
      )}
    </ErrorBoundary>
  );
}

function AdminNav({ isOwner, pendingOrderCount }: { isOwner: boolean; pendingOrderCount: number }) {
  const [path, setPath] = useState('');
  useEffect(() => { setPath(window.location.pathname); }, []);

  const isActive = (href: string) => {
    if (href === '/admin') return path === '/admin' || path === '/admin/config' || path === '/admin/catch';
    if (href.startsWith('/admin/settings')) return path.startsWith('/admin/settings');
    return path.startsWith(href);
  };

  const tabs = [
    { href: '/admin', label: 'Markets' },
    { href: '/admin/orders', label: 'Orders', badge: pendingOrderCount },
    ...(isOwner ? [{ href: '/admin/team', label: 'Team' }] : []),
    { href: '/admin/messages', label: 'Messages' },
    { href: '/admin/insights', label: 'Insights' },
    { href: '/admin/settings/stripe', label: 'Settings' },
  ];

  return (
    <nav className="admin-nav content-wrapper">
      {tabs.map(tab => (
        <div key={tab.href} style={{ position: 'relative', display: 'inline-flex' }}>
          <a href={tab.href} className={`admin-nav-item${isActive(tab.href) ? ' active' : ''}`}>
            {tab.label}
          </a>
          {tab.badge && tab.badge > 0 ? (
            <NotificationBadge position="top-right" offset="-4px" variant="coral" size="sm">
              {tab.badge}
            </NotificationBadge>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
