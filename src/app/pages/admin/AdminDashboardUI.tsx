"use client";

import { Card, NavGrid } from "@/design-system";
import type { NavGridItem } from "@/design-system";
import { AppContext } from "@/worker";
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
  const navItems: NavGridItem[] = [
    {
      icon: '📍',
      title: 'Markets',
      description: 'Manage market locations and schedules',
      href: '/admin/config'
    },
    {
      icon: '👁️',
      title: 'View Site',
      description: 'See what customers see',
      href: '/'
    }
  ]

  return (
    <Card variant="centered" maxWidth="800px">
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--deep-navy)',
            fontFamily: 'var(--font-display)',
            margin: '0 0 var(--space-xs) 0'
          }}
        >
          Admin Dashboard
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--cool-gray)',
            margin: 0,
            lineHeight: 1.5
          }}
        >
          Welcome back! Manage your business operations below.
        </p>
      </div>

      {/* Navigation Cards Grid */}
      <NavGrid
        items={navItems}
        columns={2}
        variant="detailed"
      />

      {/* Future: More cards will be added here as features arrive */}
      {/* Example: Inventory, Orders, etc. */}
    </Card>
  );
}
