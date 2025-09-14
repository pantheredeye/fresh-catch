"use client";

import { Container } from "@/design-system/components/Container";
import "@/design-system/tokens.css";

/**
 * MarketConfig - Admin market configuration interface
 *
 * SKELETON SETUP FOR DISCUSSION & PLANNING:
 *
 * This page will handle Evan's 9 markets configuration:
 * - Market details (name, location, contact info)
 * - 2-week rotation schedule setup
 * - Days/times for each market
 * - Special event management
 * - Cancellation workflows
 *
 * DESIGN DECISIONS TO DISCUSS:
 * 1. **Single Form vs Multi-Step Wizard** - How should we present 9 markets?
 * 2. **Schedule Entry Method** - Calendar picker? Time inputs? Bulk import?
 * 3. **Data Structure** - How to model the 2-week rotation pattern?
 * 4. **Visual Organization** - Cards? Table? Tabs by week?
 *
 * BREADCRUMBS FOR NEXT SESSION:
 * - Decide on market data model (Market table design)
 * - Choose UX approach for 9-market configuration
 * - Design the schedule/rotation data structure
 * - Plan integration with existing customer display
 */
export function MarketConfig({ ctx }: { ctx: any }) {

  const headerStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    marginBottom: 'var(--space-lg)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--soft-gray)',
    textAlign: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--deep-navy)',
    fontFamily: 'var(--font-display)',
    marginBottom: 'var(--space-sm)'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    color: 'var(--cool-gray)',
    margin: 0,
    lineHeight: 1.5
  };

  const placeholderStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-2xl)',
    boxShadow: 'var(--shadow-sm)',
    border: '2px dashed var(--soft-gray)',
    textAlign: 'center',
    color: 'var(--cool-gray)'
  };

  return (
    <Container>
      <div style={{
        padding: 'var(--space-xl) var(--space-md)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Market Configuration</h1>
          <p style={subtitleStyle}>
            Configure your 9 markets and 2-week rotation schedule
          </p>
        </div>

        {/* Placeholder for market configuration interface */}
        <div style={placeholderStyle}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--deep-navy)',
            marginBottom: 'var(--space-md)',
            fontFamily: 'var(--font-display)'
          }}>
            🏗️ Market Configuration Interface
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: 1.6,
            marginBottom: 'var(--space-lg)'
          }}>
            This is where Evan will configure his 9 markets:<br/>
            • Market details (name, location, contact)<br/>
            • 2-week rotation schedule<br/>
            • Days and times for each market<br/>
            • Special event management
          </p>
          <div style={{
            padding: 'var(--space-md)',
            background: 'var(--sky-blue)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--deep-navy)',
            fontSize: '14px',
            fontWeight: 500
          }}>
            💡 Ready for planning discussion and implementation
          </div>
        </div>
      </div>
    </Container>
  );
}