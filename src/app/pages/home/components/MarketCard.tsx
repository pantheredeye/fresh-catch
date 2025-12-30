import { hasAdminAccess } from "@/utils/permissions";
import type { AppContext } from "@/worker";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
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
      background: isFavorite ? 'var(--surface-favorite)' : 'var(--surface-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid rgba(0,102,204,0.08)',
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
          fontSize: '20px',
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
          color: 'var(--ocean-blue)',
          fontWeight: 600,
          fontSize: '16px'
        }}>
          {market.schedule}
        </span>
        {market.subtitle && (
          <span style={{
            color: 'var(--cool-gray)',
            fontSize: '14px'
          }}>
            {market.subtitle}
          </span>
        )}
      </div>

      <div className="flex gap-sm">
        {/* Customer action - always visible */}
        <a href={`#order-${market.id}`} style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: isAdmin ? 'var(--coral-gradient)' : 'var(--ocean-gradient)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: '16px',
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
            background: 'var(--mint-fresh)',
            color: 'var(--deep-navy)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)'
          }} title="Edit Market">
            ⚙️
          </a>
        )}
        <a href={`#directions-${market.id}`} className="icon-button-md" style={{
          background: 'var(--light-gray)',
          textDecoration: 'none',
          fontSize: '24px'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}
