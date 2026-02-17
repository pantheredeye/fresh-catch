"use client";

import { useState } from "react";
import type { AppContext } from "@/worker";
import "./dark-mode-test.css";

type Market = {
  id: string;
  name: string;
  schedule: string;
  subtitle: string | null;
  active: boolean;
};

interface Props {
  market: Market;
  ctx: AppContext;
}

/**
 * Dark Mode Test UI - Client component for interactive testing
 */
export function DarkModeTestUI({ market }: Props) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      padding: 'var(--space-xl)',
    }}>
      <div style={{
        maxWidth: 'var(--width-xl)',
        margin: '0 auto'
      }}>
        <h1 style={{
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--font-size-4xl)',
          marginBottom: 'var(--space-md)'
        }}>
          Dark Mode Market Card Tests
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-xl)',
          fontSize: 'var(--font-size-md)'
        }}>
          Toggle your system dark mode to compare approaches. Each card shows a different design direction.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-2xl)'
        }}>
          {/* Option 1: Inverted Fresh */}
          <div>
            <h3 style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-lg)',
              marginBottom: 'var(--space-md)',
              fontFamily: 'var(--font-display)'
            }}>
              1. Inverted Fresh
            </h3>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              Lighter cards, strong contrast, mint glow borders
            </p>
            <InvertedFreshCard market={market} isFavorite={isFavorite} onToggleFavorite={() => setIsFavorite(!isFavorite)} />
          </div>

          {/* Option 2: Ocean Night */}
          <div>
            <h3 style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-lg)',
              marginBottom: 'var(--space-md)',
              fontFamily: 'var(--font-display)'
            }}>
              2. Ocean Night
            </h3>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              Blue-tinted cards, ocean glow, underwater vibe
            </p>
            <OceanNightCard market={market} isFavorite={isFavorite} onToggleFavorite={() => setIsFavorite(!isFavorite)} />
          </div>

          {/* Option 3: Reverse Warmth */}
          <div>
            <h3 style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-lg)',
              marginBottom: 'var(--space-md)',
              fontFamily: 'var(--font-display)'
            }}>
              3. Reverse Warmth
            </h3>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              Warm dark tones, market stall at night feel
            </p>
            <ReverseWarmthCard market={market} isFavorite={isFavorite} onToggleFavorite={() => setIsFavorite(!isFavorite)} />
          </div>

          {/* Option 4: Glass Fresh */}
          <div>
            <h3 style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-lg)',
              marginBottom: 'var(--space-md)',
              fontFamily: 'var(--font-display)'
            }}>
              4. Glass Fresh
            </h3>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              Glassmorphism, translucent, bold borders
            </p>
            <GlassFreshCard market={market} isFavorite={isFavorite} onToggleFavorite={() => setIsFavorite(!isFavorite)} />
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface-primary)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <h3 style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-lg)',
            marginBottom: 'var(--space-sm)',
            fontFamily: 'var(--font-display)'
          }}>
            Current Implementation (for comparison)
          </h3>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-md)'
          }}>
            The existing dark mode style - dark navy on dark navy with subtle border
          </p>
          <CurrentCard market={market} isFavorite={isFavorite} onToggleFavorite={() => setIsFavorite(!isFavorite)} />
        </div>
      </div>
    </div>
  );
}

// Shared card base component
function CardBase({
  market,
  isFavorite,
  onToggleFavorite,
  style
}: {
  market: Market;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  style: React.CSSProperties;
}) {
  return (
    <div style={{
      ...style,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card">
      <button
        onClick={onToggleFavorite}
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
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'inherit',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)',
        paddingRight: 'var(--space-xl)'
      }}>
        {market.name}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
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

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <a href="#test" style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: 'var(--color-gradient-primary)',
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
          Order Fish
        </a>
        <a href="#test" style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)',
          transition: 'all 0.3s ease'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}

// Option 1: Inverted Fresh
function InvertedFreshCard({ market, isFavorite, onToggleFavorite }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card test-card--inverted-fresh">
      <button
        onClick={onToggleFavorite}
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
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)',
        paddingRight: 'var(--space-xl)'
      }}>
        {market.name}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
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

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <a href="#test" style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: 'var(--color-gradient-primary)',
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
          Order Fish
        </a>
        <a href="#test" style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)',
          transition: 'all 0.3s ease'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}

// Option 2: Ocean Night
function OceanNightCard({ market, isFavorite, onToggleFavorite }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card test-card--ocean-night">
      <button
        onClick={onToggleFavorite}
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
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)',
        paddingRight: 'var(--space-xl)'
      }}>
        {market.name}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
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

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <a href="#test" style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: 'var(--color-gradient-primary)',
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
          Order Fish
        </a>
        <a href="#test" style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)',
          transition: 'all 0.3s ease'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}

// Option 3: Reverse Warmth
function ReverseWarmthCard({ market, isFavorite, onToggleFavorite }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card test-card--reverse-warmth">
      <button
        onClick={onToggleFavorite}
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
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)',
        paddingRight: 'var(--space-xl)'
      }}>
        {market.name}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
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

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <a href="#test" style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: 'var(--color-gradient-primary)',
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
          Order Fish
        </a>
        <a href="#test" style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)',
          transition: 'all 0.3s ease'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}

// Option 4: Glass Fresh
function GlassFreshCard({ market, isFavorite, onToggleFavorite }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card test-card--glass-fresh">
      <button
        onClick={onToggleFavorite}
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
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)',
        paddingRight: 'var(--space-xl)'
      }}>
        {market.name}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
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

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <a href="#test" style={{
          flex: 1,
          padding: 'var(--space-md)',
          background: 'var(--color-gradient-primary)',
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
          Order Fish
        </a>
        <a href="#test" style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-2xl)',
          transition: 'all 0.3s ease'
        }} className="pin-button">
          📍
        </a>
      </div>
    </div>
  );
}

// Current implementation for comparison
function CurrentCard({ market, isFavorite, onToggleFavorite }: any) {
  return (
    <CardBase
      market={market}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      style={{
        background: 'var(--color-surface-primary)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-primary)'
      }}
    />
  );
}
