"use client";

import { useState, useTransition } from "react";
import { Button, Container, QuickAction } from "@/design-system";
import {
  SectionHeader,
  CompactMarketList,
  AddEventButton,
  MarketToggle,
  AdminButton,
  MarketFormModal,
} from "@/admin-design-system";
import "@/design-system/tokens.css";
import {
  createMarket,
  updateMarket,
  toggleMarketActive,
} from "./market-functions";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
};

/**
 * MarketConfigUI - Client component for market configuration UI
 *
 * RWSDK Pattern: Client Component with Server Functions
 * - Receives market data as props from server component
 * - Calls server functions for all mutations
 * - Uses useTransition for optimistic UI updates
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
export function MarketConfigUI({ markets }: { markets: Market[] }) {
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | undefined>(
    undefined
  );

  // Handler functions
  const handleAddNewMarket = () => {
    setEditingMarket(undefined);
    setIsModalOpen(true);
  };

  const handleEditMarket = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    setEditingMarket(market);
    setIsModalOpen(true);
  };

  const handleSaveMarket = async (marketData: {
    name: string;
    schedule: string;
    subtitle?: string;
    active?: boolean;
  }) => {
    startTransition(async () => {
      if (editingMarket) {
        await updateMarket(editingMarket.id, marketData);
      } else {
        await createMarket(marketData);
      }
      setIsModalOpen(false);
      setEditingMarket(undefined);
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMarket(undefined);
  };

  const handleToggleMarket = async (marketId: string) => {
    startTransition(async () => {
      await toggleMarketActive(marketId);
    });
  };

  // Filter markets by active status
  const activeMarkets = markets.filter((market) => market.active);
  const inactiveMarkets = markets.filter((market) => !market.active);

  const headerStyle: React.CSSProperties = {
    background: "var(--surface-primary)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-lg) var(--space-md)",
    marginBottom: "var(--space-lg)",
    boxShadow: "var(--shadow-sm)",
    border: "1px solid rgba(100, 116, 139, 0.1)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--deep-navy)",
    fontFamily: "var(--font-display)",
    marginBottom: "var(--space-xs)",
    textAlign: "left",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "var(--cool-gray)",
    margin: 0,
    lineHeight: 1.5,
  };

  return (
    <Container>
      <div
        style={{
          padding: "var(--space-md)",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Market Settings</h1>
          <p style={subtitleStyle}>
            Manage your markets and their active status
          </p>
        </div>

        {/* Add New Market Button */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddNewMarket}
          >
            + Add New Market
          </Button>
        </div>

        {/* Combined Markets List */}
        {(activeMarkets.length > 0 || inactiveMarkets.length > 0) && (
          <div
            style={{
              background: "var(--surface-primary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(100, 116, 139, 0.1)",
              overflow: "hidden",
              marginBottom: "var(--space-lg)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Active Markets Section */}
            {activeMarkets.length > 0 && (
              <>
                <SectionHeader>
                  Active Markets ({activeMarkets.length})
                </SectionHeader>
                {activeMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    style={{
                      padding: "var(--space-sm) var(--space-md)",
                      borderBottom:
                        index < activeMarkets.length - 1 ||
                        inactiveMarkets.length > 0
                          ? "1px solid rgba(100, 116, 139, 0.1)"
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: market.active
                        ? "var(--surface-primary)"
                        : "var(--light-gray)",
                      transition: "all 0.2s ease",
                      cursor: "default",
                      minHeight: "60px",
                      gap: "var(--space-sm)",
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-sm)",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 500,
                            color: "var(--deep-navy)",
                            fontFamily: "var(--font-display)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {market.name}
                        </div>
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--cool-gray)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {market.schedule}
                    </div>

                    {/* Right section: Edit button */}
                    <div onClick={() => handleEditMarket(market.id)}>
                      <QuickAction>Edit</QuickAction>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Inactive Markets Section */}
            {inactiveMarkets.length > 0 && (
              <>
                <SectionHeader>
                  Inactive Markets ({inactiveMarkets.length})
                </SectionHeader>
                {inactiveMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    style={{
                      padding: "var(--space-sm) var(--space-md)",
                      borderBottom:
                        index < inactiveMarkets.length - 1
                          ? "1px solid rgba(100, 116, 139, 0.1)"
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background:
                        !market.active || market.paused
                          ? "var(--light-gray)"
                          : "var(--surface-primary)",
                      opacity: !market.active || market.paused ? 0.7 : 1,
                      transition: "all 0.2s ease",
                      cursor: "default",
                      minHeight: "60px",
                      gap: "var(--space-sm)",
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-sm)",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 500,
                            color: "var(--deep-navy)",
                            fontFamily: "var(--font-display)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {market.name}
                        </div>
                        {market.subtitle && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--cool-gray)",
                              marginTop: "2px",
                            }}
                          >
                            {market.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--cool-gray)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {market.schedule}
                    </div>

                    {/* Right section: Edit button */}
                    <div onClick={() => handleEditMarket(market.id)}>
                      <QuickAction>Edit</QuickAction>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Empty State - Only shows when no markets exist */}
        {activeMarkets.length === 0 && inactiveMarkets.length === 0 && (
          <div
            style={{
              background: "var(--surface-primary)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-2xl)",
              textAlign: "center",
              border: "2px dashed rgba(100, 116, 139, 0.2)",
              color: "var(--cool-gray)",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "var(--space-md)",
              }}
            >
              🏪
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--deep-navy)",
                marginBottom: "var(--space-sm)",
                fontFamily: "var(--font-display)",
              }}
            >
              No Markets Configured
            </h3>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.5,
                marginBottom: "var(--space-lg)",
              }}
            >
              Get started by adding your first market location
            </p>
          </div>
        )}

        {/* Market Form Modal */}
        <MarketFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveMarket}
          market={editingMarket}
        />
      </div>
    </Container>
  );
}
