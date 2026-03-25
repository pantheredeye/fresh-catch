"use client";

import { useEffect, useState } from "react";
import { Card, ShareModal } from "@/design-system";
import { AppContext } from "@/worker";
import { getCurrentOrgShareUrl } from "@/utils/share";
import { trackShare } from "../home/share-functions";
import "./admin.css";

interface AdminDashboardUIProps {
  ctx: AppContext;
}

/**
 * AdminDashboardUI - Client component for admin landing page
 *
 * DESIGN DECISIONS:
 *
 * 1. **Responsive Grid Layout** (Decision: CSS Grid with mobile-first)
 *    - Mobile: 1 column stacked
 *    - Desktop: 2 columns side-by-side
 *    - Context: Equal priority actions, grows naturally as features added
 *    - Rationale: Industrial design principles, clear hierarchy, tap-friendly
 *
 * 2. **Big Button Cards** (Decision: Button-style vs decorative cards)
 *    - Context: Farmers, merchants, carpenters at different skill levels
 *    - Rationale: Clarity of purpose, no ambiguity, reduced cognitive load
 *    - Implementation: Clear labels, icons for visual scanning, ~120px height
 *
 * 3. **Equal Visual Weight** (Decision: Both cards same size/prominence)
 *    - Context: Right now, both are high-priority actions
 *    - Future: When inventory/orders added, those will be top row priority
 *    - Implementation: Same styling, same size, automatic grid layout
 *
 * NOTE: No Container needed - AdminLayout's content-wrapper handles constraints
 */
export function AdminDashboardUI({ ctx }: AdminDashboardUIProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Fetch share URL on mount
  useEffect(() => {
    getCurrentOrgShareUrl().then(url => setShareUrl(url)).catch(err => console.error('Failed to get share URL:', err));
  }, []);

  return (
    <Card variant="centered" maxWidth="800px">
      <div className="text-centered-section" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="heading-4xl">
          Admin Dashboard
        </h1>
        <p className="text-subheading">
          Welcome back! Manage your business operations below.
        </p>
      </div>

      {/* Navigation Cards Grid */}
      <div className="admin-nav-grid">
        {/* Markets Card */}
        <a href="/admin/config" className="admin-nav-card">
          <div className="admin-nav-card__icon">📍</div>
          <div className="admin-nav-card__content">
            <h3 className="admin-nav-card__title">Markets</h3>
            <p className="admin-nav-card__description">
              Manage market locations and schedules
            </p>
          </div>
        </a>

        {/* View Site Card */}
        <a href="/" className="admin-nav-card">
          <div className="admin-nav-card__icon">👁️</div>
          <div className="admin-nav-card__content">
            <h3 className="admin-nav-card__title">View Site</h3>
            <p className="admin-nav-card__description">
              See what customers see
            </p>
          </div>
        </a>

        {/* Share Business Card */}
        <button
          onClick={() => setShareModalOpen(true)}
          className="admin-nav-card"
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-nav-card__icon">🔗</div>
          <div className="admin-nav-card__content">
            <h3 className="admin-nav-card__title">Share Business</h3>
            <p className="admin-nav-card__description">
              Get link, QR code, social media
            </p>
          </div>
        </button>
      </div>

      {/* Future: More cards will be added here as features arrive */}
      {/* Example: Inventory, Orders, etc. */}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        title="Fresh Catch Seafood Markets"
        description="Share your business marketplace"
        onShareAction={(shareType) => trackShare(shareType)}
      />
    </Card>
  );
}
