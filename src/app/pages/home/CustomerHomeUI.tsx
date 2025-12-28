"use client";

import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import type { AppContext } from "@/worker";
import {
  LiveBanner,
  FreshHero,
  MarketCard,
  BottomNavigation
} from "./components";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
};

type FreshCatch = {
  emoji: string;
  name: string;
};

type QuickAction = {
  icon: string;
  title: string;
  href: string;
};

/**
 * CustomerHomeUI - Client Component
 *
 * RWSDK Pattern: Client component with all UI and interactivity
 * - Receives market data from server component
 * - Uses useFavorites hook for localStorage favorites
 * - Filters markets into "Your Markets" and "All Markets" sections
 */
export function CustomerHomeUI({
  markets,
  freshCatch,
  quickActions,
  ctx
}: {
  markets: Market[];
  freshCatch: FreshCatch[];
  quickActions: QuickAction[];
  ctx: AppContext;
}) {
  const [favorites, toggleFavorite] = useFavorites();

  // Filter markets into favorites and all
  const favoriteMarkets = markets.filter(m => favorites.includes(m.id));
  const allMarkets = markets;

  return (
    <div style={{
      background: 'var(--page-background)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden' // Contain 200% background
    }}>
      {/* Mesh Gradient Background */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '200%',
        height: '200%',
        background: `
          radial-gradient(circle at 20% 50%, rgba(0,217,177,0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(0,102,204,0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(255,107,107,0.05) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Live Indicator - TODO: Show only when actually live */}
      <LiveBanner />

      {/* Fresh Hero Section */}
      <FreshHero freshCatch={freshCatch} actions={quickActions} />

      {/* Your Markets Section - Only show if user has favorites */}
      {favoriteMarkets.length > 0 && (
        <YourMarketsSection
          markets={favoriteMarkets}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          ctx={ctx}
        />
      )}

      {/* All Markets Section */}
      <AllMarketsSection
        markets={allMarkets}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        ctx={ctx}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function YourMarketsSection({
  markets,
  favorites,
  onToggleFavorite,
  ctx
}: {
  markets: Market[];
  favorites: string[];
  onToggleFavorite: (marketId: string) => void;
  ctx: AppContext;
}) {
  return (
    <div style={{
      padding: 'var(--space-lg) var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-md)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--deep-navy)',
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}>
          Your Markets ({markets.length})
        </h2>
      </div>

      {markets.map(market => (
        <MarketCard
          key={market.id}
          market={market}
          isFavorite={favorites.includes(market.id)}
          onToggleFavorite={onToggleFavorite}
          ctx={ctx}
        />
      ))}
    </div>
  );
}

function AllMarketsSection({
  markets,
  favorites,
  onToggleFavorite,
  ctx
}: {
  markets: Market[];
  favorites: string[];
  onToggleFavorite: (marketId: string) => void;
  ctx: AppContext;
}) {
  return (
    <div style={{
      padding: 'var(--space-lg) var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-md)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--deep-navy)',
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}>
          All Markets ({markets.length})
        </h2>
      </div>

      {markets.map(market => (
        <MarketCard
          key={market.id}
          market={market}
          isFavorite={favorites.includes(market.id)}
          onToggleFavorite={onToggleFavorite}
          ctx={ctx}
        />
      ))}
    </div>
  );
}
