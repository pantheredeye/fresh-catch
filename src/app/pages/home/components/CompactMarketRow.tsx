"use client";

interface CompactMarketRowProps {
  market: {
    id: string;
    name: string;
    schedule: string;
    catchPreview?: string | null;
    county?: string | null;
    city?: string | null;
  };
  isFavorite: boolean;
  onToggleFavorite: (marketId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isLast?: boolean;
  vendorSlug?: string;
}

function parseCatchPreview(catchPreview?: string | null): string | null {
  if (!catchPreview) return null;
  try {
    const preview = JSON.parse(catchPreview);
    const items = preview?.items;
    if (!items || items.length === 0) return null;
    return items.map((i: { name: string }) => i.name).join(", ");
  } catch {
    return null;
  }
}

export function CompactMarketRow({
  market,
  isFavorite,
  onToggleFavorite,
  isExpanded,
  onToggle,
  isLast = false,
  vendorSlug,
}: CompactMarketRowProps) {
  const catchNames = parseCatchPreview(market.catchPreview);
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
        aria-expanded={isExpanded}
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
        className="compact-row-toggle"
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

      {/* Expanded content */}
      <div
        style={{
          maxHeight: isExpanded ? "300px" : "0",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
        className="compact-row-expand"
      >
        <div
          style={{
            padding: `0 0 var(--space-lg) 0`,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
          }}
        >
          {catchNames && (
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              Usually available: {catchNames}
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <a
              href={`/orders/new?market=${market.id}${vendorSlug ? `&b=${vendorSlug}` : ""}`}
              style={{
                flex: 1,
                padding: "var(--space-md)",
                background: "var(--color-gradient-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: "var(--font-weight-bold)",
                fontSize: "var(--font-size-md)",
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "var(--shadow-md)",
              }}
              className="btn btn--primary"
            >
              Order Fish
            </a>

            <a
              href={`#directions-${market.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "var(--space-md) var(--space-lg)",
                background: "var(--color-surface-secondary)",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-primary)",
                fontWeight: "var(--font-weight-semibold)",
                flexShrink: 0,
              }}
              aria-label={`Get directions to ${market.name}`}
            >
              <span aria-hidden="true">📍</span> Directions
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .compact-row-toggle:focus-visible {
          outline: 2px solid var(--color-action-primary);
          outline-offset: -2px;
          border-radius: var(--radius-sm);
        }
        @media (prefers-reduced-motion: reduce) {
          .compact-row-expand {
            transition: none !important;
          }
          .compact-row-toggle span[aria-hidden="true"] {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
