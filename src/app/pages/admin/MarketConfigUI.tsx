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
import {
  createMarket,
  updateMarket,
  toggleMarketActive,
} from "./market-functions";
import "@/admin-design-system/admin-components.css";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  locationDetails: string | null;
  customerInfo: string | null;
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
    subtitle?: string | null;
    locationDetails?: string | null;
    customerInfo?: string | null;
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

  return (
    <Container>
      <div className="config-page">
        {/* Header */}
        <div className="config-header">
          <h1 className="config-title">Market Settings</h1>
          <p className="config-subtitle">
            Manage your markets and their active status
          </p>
        </div>

        {/* Add New Market Button */}
        <div className="config-actions">
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
          <div className="markets-list-container">
            {/* Active Markets Section */}
            {activeMarkets.length > 0 && (
              <>
                <SectionHeader>
                  Active Markets ({activeMarkets.length})
                </SectionHeader>
                {activeMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    className="market-item"
                    style={{
                      borderBottom:
                        index < activeMarkets.length - 1 ||
                        inactiveMarkets.length > 0
                          ? undefined
                          : "none",
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div className="market-item__left">
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div className="market-item__info">
                        <div className="market-item__name">
                          {market.name}
                        </div>
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div className="market-item__schedule">
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
                    className={`market-item market-item--inactive`}
                    style={{
                      borderBottom:
                        index < inactiveMarkets.length - 1
                          ? undefined
                          : "none",
                    }}
                  >
                    {/* Left section: Toggle + Market Name */}
                    <div className="market-item__left">
                      <MarketToggle
                        active={market.active}
                        marketName={market.name}
                        disabled={false}
                        onClick={() => handleToggleMarket(market.id)}
                      />
                      <div className="market-item__info">
                        <div className="market-item__name">
                          {market.name}
                        </div>
                        {market.subtitle && (
                          <div className="market-item__subtitle">
                            {market.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle section: Schedule */}
                    <div className="market-item__schedule">
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
          <div className="config-empty-state">
            <div className="config-empty-state__icon">
              🏪
            </div>
            <h3 className="config-empty-state__title">
              No Markets Configured
            </h3>
            <p className="config-empty-state__description">
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
