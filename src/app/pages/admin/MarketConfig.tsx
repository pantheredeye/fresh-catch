"use client";

import { useState } from "react";
import { Container } from "@/design-system";
import { SectionHeader, CompactMarketList, AddEventButton, MarketToggle, AdminButton } from "@/admin-design-system";
import "@/design-system/tokens.css";

/**
 * MarketConfig - Market Settings page for admin configuration
 *
 * MARKET SETTINGS PAGE:
 * - Lists all markets (active/inactive grouping)
 * - Add new market capability
 * - Toggle market active/inactive status
 * - Tap-to-edit market details (opens market detail form)
 * - Empty state handling
 *
 * PRIORITY GUIDE:
 * Priority 1: Status Control - Toggle (immediate control)
 * Priority 2: Recognition - Market name, schedule pattern
 * Priority 3: Navigation - Tap to edit, Add new market
 * Priority 4: Overview - Active/inactive grouping
 */
export function MarketConfig({ ctx }: { ctx: any }) {

  // State for managing market data
  const [markets, setMarkets] = useState([
    {
      id: '1',
      name: 'Hernando',
      schedule: 'Sat 8-2',
      active: true
    },
    {
      id: '2',
      name: 'Oxford City',
      schedule: 'Tue 3-6:30',
      active: true
    },
    {
      id: '3',
      name: 'Olive Branch',
      schedule: 'Sat 9-1',
      active: true
    },
    {
      id: '4',
      name: 'Adobe Farmers',
      schedule: 'Fri 4-7',
      active: true
    },
    {
      id: '5',
      name: 'Senatobia Sunday',
      schedule: 'Sun 9-2',
      active: false,
      paused: true,
      subtitle: 'Paused until March'
    },
    {
      id: '6',
      name: 'Holly Springs Night',
      schedule: 'Fri 5-9',
      active: false,
      paused: true,
      subtitle: 'Winter break'
    }
  ]);

  // Handler functions
  const handleAddNewMarket = () => {
    // TODO: Navigate to new market form
    console.log('Add new market clicked');
  };

  const handleEditMarket = (marketId: string) => {
    // TODO: Navigate to market edit form
    console.log('Edit market:', marketId);
  };

  const handleToggleMarket = (marketId: string) => {
    setMarkets(prevMarkets =>
      prevMarkets.map(market =>
        market.id === marketId
          ? { ...market, active: !market.active }
          : market
      )
    );
  };

  // Filter markets by active status
  const activeMarkets = markets.filter(market => market.active);
  const inactiveMarkets = markets.filter(market => !market.active);

  const headerStyle: React.CSSProperties = {
    background: 'var(--surface-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg) var(--space-md)',
    marginBottom: 'var(--space-lg)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(100, 116, 139, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--deep-navy)',
    fontFamily: 'var(--font-display)',
    marginBottom: 'var(--space-xs)',
    textAlign: 'left'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--cool-gray)',
    margin: 0,
    lineHeight: 1.5
  };

  return (
    <Container>
      <div style={{
        padding: 'var(--space-md)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Market Settings</h1>
          <p style={subtitleStyle}>
            Manage your markets and their active status
          </p>
        </div>

        {/* Add New Market Button */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <AddEventButton onClick={handleAddNewMarket} fullWidth={true}>+ Add New Market</AddEventButton>
        </div>

        {/* Combined Markets List */}
        {(activeMarkets.length > 0 || inactiveMarkets.length > 0) && (
          <div style={{
            background: 'var(--surface-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(100, 116, 139, 0.1)',
            overflow: 'hidden',
            marginBottom: 'var(--space-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Active Markets Section */}
            {activeMarkets.length > 0 && (
              <>
                <SectionHeader>Active Markets ({activeMarkets.length})</SectionHeader>
                {activeMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      borderBottom: index < activeMarkets.length - 1 || inactiveMarkets.length > 0 ? '1px solid rgba(100, 116, 139, 0.1)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: market.active ? 'var(--surface-primary)' : 'var(--light-gray)',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                      minHeight: '60px',
                      gap: 'var(--space-sm)'
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'var(--deep-navy)',
                          fontFamily: 'var(--font-display)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {market.name}
                        </div>
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--cool-gray)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                      flexShrink: 0
                    }}>
                      {market.schedule}
                    </div>

                    {/* Right section: Edit button */}
                    <div onClick={() => handleEditMarket(market.id)}>
                      <AdminButton variant="cancel" size="sm">Edit</AdminButton>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Inactive Markets Section */}
            {inactiveMarkets.length > 0 && (
              <>
                <SectionHeader>Inactive Markets ({inactiveMarkets.length})</SectionHeader>
                {inactiveMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      borderBottom: index < inactiveMarkets.length - 1 ? '1px solid rgba(100, 116, 139, 0.1)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: (!market.active || market.paused) ? 'var(--light-gray)' : 'var(--surface-primary)',
                      opacity: (!market.active || market.paused) ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                      minHeight: '60px',
                      gap: 'var(--space-sm)'
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'var(--deep-navy)',
                          fontFamily: 'var(--font-display)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {market.name}
                        </div>
                        {market.subtitle && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--cool-gray)',
                            marginTop: '2px'
                          }}>
                            {market.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--cool-gray)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                      flexShrink: 0
                    }}>
                      {market.schedule}
                    </div>

                    {/* Right section: Edit button */}
                    <div onClick={() => handleEditMarket(market.id)}>
                      <AdminButton variant="cancel" size="sm">Edit</AdminButton>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Empty State - Only shows when no markets exist */}
        {activeMarkets.length === 0 && inactiveMarkets.length === 0 && (
          <div style={{
            background: 'var(--surface-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-2xl)',
            textAlign: 'center',
            border: '2px dashed rgba(100, 116, 139, 0.2)',
            color: 'var(--cool-gray)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: 'var(--space-md)'
            }}>🏪</div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--deep-navy)',
              marginBottom: 'var(--space-sm)',
              fontFamily: 'var(--font-display)'
            }}>
              No Markets Configured
            </h3>
            <p style={{
              fontSize: '14px',
              lineHeight: 1.5,
              marginBottom: 'var(--space-lg)'
            }}>
              Get started by adding your first market location
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}