"use client";

import { useFavorites } from "@/hooks/useFavorites";
import type { AppContext } from "@/worker";
import {
  LiveBanner,
  FreshHero,
  FreshSheet,
  MarketCard,
  PopupCard,
  BottomNavigation
} from "./components";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
  catchPreview?: string | null;
};

type CatchData = {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
  updatedAt: string;
};

type PopupMarket = {
  id: string;
  name: string;
  schedule: string;
  expiresAt: string;
  locationDetails?: string | null;
  customerInfo?: string | null;
  catchPreview?: string | null;
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
  popups,
  catchData,
  quickActions,
  ctx
}: {
  markets: Market[];
  popups: PopupMarket[];
  catchData: CatchData | null;
  quickActions: QuickAction[];
  ctx: AppContext;
}) {
  const [favorites, toggleFavorite] = useFavorites();
  const vendorSlug = ctx.browsingOrganization?.slug;

  // Filter markets into favorites and all
  const favoriteMarkets = markets.filter(m => favorites.includes(m.id));
  const allMarkets = markets;

  return (
    <div style={{
      background: 'var(--color-bg-primary)',
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

      {/* Fresh Catch or Hero Fallback */}
      {catchData ? (
        <FreshSheet catch={catchData} vendorSlug={vendorSlug} />
      ) : (
        <FreshHero actions={quickActions} />
      )}

      {/* Popup Markets Section - Only show if popups exist */}
      {popups.length > 0 && (
        <PopupSection popups={popups} vendorSlug={vendorSlug} />
      )}

      {/* Your Markets Section - Only show if user has favorites */}
      {favoriteMarkets.length > 0 && (
        <YourMarketsSection
          markets={favoriteMarkets}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          ctx={ctx}
          vendorSlug={vendorSlug}
        />
      )}

      {/* All Markets Section */}
      <AllMarketsSection
        markets={allMarkets}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        ctx={ctx}
        vendorSlug={vendorSlug}
      />

      {/* Bottom Navigation */}
      <BottomNavigation vendorSlug={vendorSlug} />
    </div>
  );
}

function YourMarketsSection({
  markets,
  favorites,
  onToggleFavorite,
  ctx,
  vendorSlug
}: {
  markets: Market[];
  favorites: string[];
  onToggleFavorite: (marketId: string) => void;
  ctx: AppContext;
  vendorSlug?: string;
}) {
  return (
    <div style={{
      padding: 'var(--space-lg) var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div className="flex-between mb-md">
        <h2 className="heading-2xl m-0">
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
          vendorSlug={vendorSlug}
        />
      ))}
    </div>
  );
}

function AllMarketsSection({
  markets,
  favorites,
  onToggleFavorite,
  ctx,
  vendorSlug
}: {
  markets: Market[];
  favorites: string[];
  onToggleFavorite: (marketId: string) => void;
  ctx: AppContext;
  vendorSlug?: string;
}) {
  return (
    <div style={{
      padding: 'var(--space-lg) var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div className="flex-between mb-md">
        <h2 className="heading-2xl m-0">
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
          vendorSlug={vendorSlug}
        />
      ))}
    </div>
  );
}

function PopupSection({ popups, vendorSlug }: { popups: PopupMarket[]; vendorSlug?: string }) {
  return (
    <div style={{
      padding: 'var(--space-lg) var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div className="flex-between mb-md">
        <h2 className="heading-2xl m-0">
          Coming Up
        </h2>
      </div>

      {popups.map(popup => (
        <PopupCard
          key={popup.id}
          popup={{
            name: popup.name,
            schedule: popup.schedule,
            expiresAt: popup.expiresAt,
            locationDetails: popup.locationDetails,
            customerInfo: popup.customerInfo,
            catchPreview: popup.catchPreview ? JSON.parse(popup.catchPreview) : null
          }}
          vendorSlug={vendorSlug}
        />
      ))}

      <a
        href="/markets/past"
        style={{
          display: 'block',
          textAlign: 'center',
          color: 'var(--color-action-primary)',
          fontSize: 'var(--font-size-sm)',
          textDecoration: 'none',
          marginTop: 'var(--space-xs)'
        }}
      >
        See past popups →
      </a>
    </div>
  );
}
