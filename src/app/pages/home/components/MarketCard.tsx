import { hasAdminAccess } from "@/utils/permissions";
import type { AppContext } from "@/worker";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
  catchPreview?: string | null;
};

interface MarketCardProps {
  market: Market;
  isFavorite: boolean;
  onToggleFavorite: (marketId: string) => void;
  ctx: AppContext;
}

/**
 * MarketCard - Customer-facing market display card
 *
 * WHY: Shows market details with favorite toggle and action buttons.
 * Customer sees "Order Fish", admin sees "Manage Market" + quick settings.
 * Uses design tokens for consistent styling across the app.
 */
export function MarketCard({
  market,
  isFavorite,
  onToggleFavorite,
  ctx
}: MarketCardProps) {
  const isAdmin = hasAdminAccess(ctx);

  return (
    <div style={{
      background: isFavorite ? 'var(--color-surface-favorite)' : 'var(--color-surface-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--color-border-subtle)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card">

      {/* Favorite Toggle */}
      <button
        onClick={() => onToggleFavorite(market.id)}
        style={{
          position: 'absolute',
          top: 'var(--space-md)',
          right: 'var(--space-md)',
          fontSize: 'var(--font-size-xl)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0
        }}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div className="heading-xl" style={{
        paddingRight: 'var(--space-xl)' // Space for favorite button
      }}>
        {market.name}
      </div>

      <div className="flex-col gap-xs" style={{
        marginBottom: 'var(--space-lg)'
      }}>
        <span style={{
          color: 'var(--color-action-primary)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--font-size-md)'
        }}>
          {market.schedule}
        </span>
        {market.subtitle && (
          <span style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)'
          }}>
            {market.subtitle}
          </span>
        )}
      </div>

      {/* Catch Preview - subtle display of usually available items */}
      {market.catchPreview && (() => {
        try {
          const preview = JSON.parse(market.catchPreview);
          const items = preview?.items;
          if (!items || items.length === 0) return null;
          const names = items.map((i: { name: string }) => i.name).join(", ");
          return (
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-md)'
            }}>
              Usually available: {names}
            </div>
          );
        } catch { return null; }
      })()}

      <div className="flex gap-sm">
        {/* Customer action - always visible */}
        <a href={isAdmin ? `/admin/orders` : `/orders/new?market=${market.id}`} style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: isAdmin ? 'var(--color-gradient-secondary)' : 'var(--color-gradient-primary)',
          color: 'var(--color-text-inverse)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 'var(--font-weight-bold)',
          fontSize: 'var(--font-size-md)',
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.3s ease'
        }} className="btn btn--primary">
          {isAdmin ? 'Manage Market' : 'Order Fish'}
        </a>

        {/* Admin-only quick actions */}
        {isAdmin && (
          <a href={`/admin/config?market=${market.id}`} className="icon-button-md" style={{
            background: 'var(--color-status-success)',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)'
          }} title="Edit Market">
            ⚙️
          </a>
        )}
        <a href={`#directions-${market.id}`} className="icon-button-md" style={{
          background: 'var(--color-surface-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}
