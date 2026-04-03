"use client";

interface CompactMarketRowProps {
  market: {
    id: string;
    name: string;
    schedule: string;
  };
  isFavorite: boolean;
  onToggleFavorite: (marketId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isLast?: boolean;
}

export function CompactMarketRow({
  market,
  isFavorite,
  onToggleFavorite,
  isExpanded,
  onToggle,
  isLast = false,
}: CompactMarketRowProps) {
  return (
    <div
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--color-border-subtle)",
      }}
    >
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: "64px",
          padding: "var(--space-sm) 0",
          cursor: "pointer",
          gap: "var(--space-sm)",
        }}
      >
        {/* Market name */}
        <span
          style={{
            flex: 1,
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-primary)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {market.name}
        </span>

        {/* Schedule */}
        <span
          style={{
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-action-primary)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {market.schedule}
        </span>

        {/* Favorite star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(market.id);
          }}
          aria-label={
            isFavorite
              ? `Remove ${market.name} from favorites`
              : `Add ${market.name} to favorites`
          }
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-xl)",
            width: "52px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
            color: isFavorite ? "var(--color-accent-gold)" : "var(--color-text-tertiary)",
          }}
        >
          {isFavorite ? "\u2605" : "\u2606"}
        </button>

        {/* Chevron */}
        <span
          style={{
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-tertiary)",
            transition: "transform 0.2s ease",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {"\u203A"}
        </span>
      </div>
    </div>
  );
}
