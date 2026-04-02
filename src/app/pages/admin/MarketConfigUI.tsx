"use client";

import { useState, useTransition } from "react";
import { Button, QuickAction, AddEventButton, SectionHeader, MarketToggle } from "@/design-system";
import { CompactMarketList, MarketFormModal } from "./components";
import {
  createMarket,
  updateMarket,
  deleteMarket,
  toggleMarketActive,
  cancelPopup,
  endPopup,
} from "./market-functions";
import "./admin.css";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  locationDetails: string | null;
  customerInfo: string | null;
  active: boolean;
  type: string;
  expiresAt: string | null;
  catchPreview: string | null;
  cancelledAt: string | null;
};

function getDateBadge(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCatchPreviewSummary(catchPreview: string | null): string | null {
  if (!catchPreview) return null;
  try {
    const parsed = JSON.parse(catchPreview);
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed.items.map((i: { name: string }) => i.name).join(", ");
    }
  } catch {}
  return null;
}

function isExpired(market: Market): boolean {
  return market.type === "popup" && !!market.expiresAt && new Date(market.expiresAt) < new Date();
}

function isCancelled(market: Market): boolean {
  return !!market.cancelledAt;
}

function getInactiveBadge(market: Market): { label: string; className: string } {
  if (market.type === "popup" && isCancelled(market)) {
    return { label: "Cancelled", className: "badge--cancelled" };
  }
  if (market.type === "popup" && isExpired(market)) {
    return { label: "Expired", className: "badge--expired" };
  }
  return { label: "Inactive", className: "badge--inactive" };
}

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
  const [modalPresetType, setModalPresetType] = useState<"regular" | "popup">("regular");
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  // Handler functions
  const handleAddNewMarket = () => {
    setEditingMarket(undefined);
    setModalPresetType("regular");
    setIsModalOpen(true);
  };

  const handleAddPopup = () => {
    setEditingMarket(undefined);
    setModalPresetType("popup");
    setIsModalOpen(true);
  };

  const handleEditMarket = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    setEditingMarket(market);
    setModalPresetType(market?.type === "popup" ? "popup" : "regular");
    setIsModalOpen(true);
  };

  const handleSaveMarket = async (marketData: {
    name: string;
    schedule: string;
    subtitle?: string | null;
    locationDetails?: string | null;
    customerInfo?: string | null;
    active?: boolean;
    type?: string;
    expiresAt?: string | null;
    catchPreview?: string | null;
    notes?: string | null;
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

  const handleDeleteMarket = async (id: string) => {
    startTransition(async () => {
      await deleteMarket(id);
      setIsModalOpen(false);
      setEditingMarket(undefined);
    });
  };

  const handleEndPopup = async (id: string) => {
    startTransition(async () => {
      await endPopup(id);
      setIsModalOpen(false);
      setEditingMarket(undefined);
    });
  };

  const handleCancelPopup = async (id: string) => {
    startTransition(async () => {
      await cancelPopup(id);
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

  // Three-section grouping
  const activePopups = markets.filter(
    (m) => m.type === "popup" && m.active && !isExpired(m) && !isCancelled(m)
  );
  const activeRegular = markets.filter(
    (m) => m.type !== "popup" && m.active
  );
  const inactiveMarkets = markets.filter(
    (m) => !m.active || (m.type === "popup" && (isExpired(m) || isCancelled(m)))
  );

  const hasAnyMarkets = markets.length > 0;

  return (
    <div className="config-page">
        {/* Header */}
        <div className="config-header">
          <h1 className="config-title">Market Settings</h1>
          <p className="config-subtitle">
            Manage your markets and their active status
          </p>
        </div>

        {/* Add Buttons */}
        <div className="config-actions config-actions--split">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddNewMarket}
          >
            + Add Market
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleAddPopup}
          >
            + Add Popup
          </Button>
        </div>

        {hasAnyMarkets && (
          <>
            {/* Section 1: Active Popups */}
            {activePopups.length > 0 && (
              <div className="markets-list-container markets-list-container--popup">
                <SectionHeader>
                  Active Popups ({activePopups.length})
                </SectionHeader>
                {activePopups.map((market) => {
                  const dateBadge = getDateBadge(market.expiresAt);
                  const catchSummary = getCatchPreviewSummary(market.catchPreview);
                  return (
                    <div key={market.id} className="market-item market-item--popup">
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
                            {dateBadge && (
                              <span className="popup-date-badge">{dateBadge}</span>
                            )}
                          </div>
                          {market.schedule && (
                            <div className="market-item__subtitle">{market.schedule}</div>
                          )}
                          {catchSummary && (
                            <div className="market-item__catch-preview">{catchSummary}</div>
                          )}
                        </div>
                      </div>
                      <div onClick={() => handleEditMarket(market.id)}>
                        <QuickAction>Edit</QuickAction>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section 2: Active Regular Markets */}
            {activeRegular.length > 0 && (
              <div className="markets-list-container">
                <SectionHeader>
                  Markets ({activeRegular.length})
                </SectionHeader>
                {activeRegular.map((market) => (
                  <div key={market.id} className="market-item">
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
                    <div className="market-item__schedule">
                      {market.schedule}
                    </div>
                    <div onClick={() => handleEditMarket(market.id)}>
                      <QuickAction>Edit</QuickAction>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section 3: Inactive / Expired (collapsed by default) */}
            {inactiveMarkets.length > 0 && (
              <div className="markets-list-container markets-list-container--inactive">
                <div
                  className="inactive-section-header"
                  onClick={() => setInactiveExpanded(!inactiveExpanded)}
                >
                  <SectionHeader>
                    Inactive ({inactiveMarkets.length})
                  </SectionHeader>
                  <span className={`inactive-chevron ${inactiveExpanded ? "inactive-chevron--open" : ""}`}>
                    &#9662;
                  </span>
                </div>
                {inactiveExpanded && inactiveMarkets.map((market) => {
                  const badge = getInactiveBadge(market);
                  return (
                    <div key={market.id} className="market-item market-item--inactive">
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
                            <span className={`status-badge ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          {market.subtitle && (
                            <div className="market-item__subtitle">
                              {market.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="market-item__schedule">
                        {market.schedule}
                      </div>
                      <div onClick={() => handleEditMarket(market.id)}>
                        <QuickAction>Edit</QuickAction>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!hasAnyMarkets && (
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
          onDelete={handleDeleteMarket}
          onEndPopup={handleEndPopup}
          onCancelPopup={handleCancelPopup}
          market={editingMarket}
          presetType={modalPresetType}
          isPending={isPending}
        />
    </div>
  );
}
