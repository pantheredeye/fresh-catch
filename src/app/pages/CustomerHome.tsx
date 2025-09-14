import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import type { AppContext } from "@/worker";

// Mock data for development - TODO: Replace with real data from context/API
const MOCK_USER = {
  name: "Sarah",
  favoriteMarkets: ["oxford-city", "hernando-farmers"]
};

const MOCK_FRESH_CATCH = [
  { emoji: "🦐", name: "Shrimp" },
  { emoji: "🐟", name: "Redfish" },
  { emoji: "🐠", name: "Flounder" },
  { emoji: "🦀", name: "Crab" },
  { emoji: "🦪", name: "Oysters" },
  { emoji: "🐟", name: "Trout" }
];

const MOCK_MARKETS = [
  {
    id: "oxford-city",
    name: "Oxford City Market",
    date: "Tuesday, November 5",
    time: "3:00 PM - 6:30 PM",
    status: "3 days away",
    isFavorite: true,
    isLive: false
  },
  {
    id: "hernando-farmers",
    name: "Hernando Farmers Market",
    date: "Saturday, November 9",
    time: "10:00 AM - 2:00 PM",
    status: "This Saturday",
    isFavorite: true,
    isLive: false
  }
];

const MOCK_QUICK_ACTIONS = [
  { icon: "📅", title: "All Markets", href: "#markets" },
  { icon: "🍳", title: "Recipes", href: "#recipes" },
  { icon: "💬", title: "Text Evan", href: "#text" },
  { icon: "📞", title: "Call", href: "#call" }
];

export function CustomerHome({ ctx }: RequestInfo) {
  const user = ctx.user || MOCK_USER;

  return (
    <div style={{
      background: 'var(--warm-white)',
      minHeight: '100vh',
      paddingBottom: '80px', // Space for bottom nav
      position: 'relative'
    }}>
      {/* Mesh Gradient Background */}
      <div style={{
        position: 'fixed',
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

      {/* Header */}
      <Header />

      {/* Live Indicator - TODO: Show only when actually live */}
      <LiveBanner />

      {/* Fresh Hero Section */}
      <FreshHero />

      {/* Markets Section */}
      <MarketsSection markets={MOCK_MARKETS} ctx={ctx} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function Header() {
  return (
    <header style={{
      background: 'var(--glass-white)',
      backdropFilter: 'blur(20px)',
      padding: 'var(--space-md)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid rgba(0,102,204,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          background: 'var(--ocean-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}>
          Evan's Fresh Catch
        </h1>

        <a href="#quick-order" style={{
          padding: 'var(--space-xs) var(--space-md)',
          background: 'var(--coral-gradient)',
          color: 'white',
          borderRadius: 'var(--radius-full)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: 'var(--shadow-coral)',
          transition: 'all 0.3s ease'
        }}>
          + Quick Order
        </a>
      </div>
    </header>
  );
}

function LiveBanner() {
  return (
    <div style={{
      background: 'var(--mint-fresh)',
      color: 'white',
      padding: 'var(--space-sm)',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-sm)'
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        background: 'white',
        borderRadius: '50%',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.3)',
        animation: 'live-pulse 2s ease-in-out infinite'
      }} />
      <span>LIVE at Livingston Market</span>
    </div>
  );
}

function FreshHero() {
  return (
    <div style={{
      margin: 'var(--space-md)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      background: 'var(--ocean-gradient)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
      color: 'white'
    }} className="fresh-section">

      <div style={{
        position: 'relative',
        zIndex: 1,
        marginBottom: 'var(--space-lg)'
      }}>
        <div style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          opacity: 0.9,
          marginBottom: 'var(--space-sm)'
        }}>
          This Week's Catch
        </div>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}>
          Fresh from the Gulf
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-sm)',
        position: 'relative',
        zIndex: 1
      }}>
        {MOCK_FRESH_CATCH.map((item, index) => (
          <div key={index} style={{
            background: 'var(--glass-white)',
            color: 'var(--deep-navy)',
            padding: 'var(--space-md) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <span style={{
              display: 'block',
              fontSize: '28px',
              marginBottom: 'var(--space-xs)',
              filter: 'saturate(1.2)'
            }}>
              {item.emoji}
            </span>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsSection({ markets, ctx }: { markets: typeof MOCK_MARKETS, ctx?: AppContext }) {
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
          Your Markets
        </h2>
        <a href="#edit" style={{
          color: 'var(--ocean-blue)',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none'
        }}>
          Edit
        </a>
      </div>

      {markets.map(market => (
        <MarketCard key={market.id} market={market} ctx={ctx} />
      ))}
    </div>
  );
}

function MarketCard({ market, ctx }: { market: typeof MOCK_MARKETS[0], ctx?: AppContext }) {
  const isAdmin = ctx ? hasAdminAccess(ctx) : false;
  return (
    <div style={{
      background: market.isFavorite ? 'var(--surface-favorite)' : 'white',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid rgba(0,102,204,0.08)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }} className="card">

      {market.isFavorite && (
        <span style={{
          position: 'absolute',
          top: 'var(--space-md)',
          right: 'var(--space-md)',
          fontSize: '20px'
        }}>
          ⭐
        </span>
      )}

      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        color: 'var(--deep-navy)',
        marginBottom: 'var(--space-xs)',
        fontFamily: 'var(--font-display)'
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
          color: 'var(--ocean-blue)',
          fontWeight: 600,
          fontSize: '16px'
        }}>
          {market.date}
        </span>
        <span style={{
          color: 'var(--cool-gray)',
          fontSize: '14px'
        }}>
          {market.time}
        </span>
        <span style={{
          display: 'inline-block',
          background: 'var(--light-gray)',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 'var(--radius-full)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--cool-gray)',
          marginTop: 'var(--space-xs)',
          width: 'fit-content'
        }}>
          {market.status}
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
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
          <a href={`/admin/config?market=${market.id}`} style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--mint-fresh)',
            color: 'var(--deep-navy)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '18px',
            transition: 'all 0.3s ease'
          }} title="Edit Market">
            ⚙️
          </a>
        )}
        <a href={`#directions-${market.id}`} style={{
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--light-gray)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontSize: '24px',
          transition: 'all 0.3s ease'
        }}>
          📍
        </a>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div style={{
      padding: '0 var(--space-md) var(--space-xl)',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {MOCK_QUICK_ACTIONS.map((action, index) => (
        <a key={index} href={action.href} style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg) var(--space-md)',
          textAlign: 'center',
          textDecoration: 'none',
          color: 'var(--deep-navy)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease',
          border: `2px solid ${index === 0 ? 'rgba(0,102,204,0.2)' : index === 1 ? 'rgba(255,107,107,0.2)' : index === 2 ? 'rgba(0,217,177,0.2)' : 'rgba(255,179,102,0.2)'}`
        }} className="card">
          <div style={{
            fontSize: '32px',
            marginBottom: 'var(--space-sm)',
            filter: 'saturate(1.5)'
          }}>
            {action.icon}
          </div>
          <div style={{
            fontWeight: 600,
            fontSize: '14px'
          }}>
            {action.title}
          </div>
        </a>
      ))}
    </div>
  );
}

function BottomNavigation() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 'var(--space-md)',
      left: 'var(--space-md)',
      right: 'var(--space-md)',
      background: 'white',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 200,
      border: '1px solid rgba(0,102,204,0.08)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 'var(--space-sm)'
      }}>
        <NavItem label="Home" active />
        <NavItem label="Markets" />
        <NavItem label="Orders" badge="2" />
        <NavItem label="More" />
      </div>
    </nav>
  );
}

function NavItem({ label, active = false, badge }: { label: string; active?: boolean; badge?: string }) {
  return (
    <a href={`#${label.toLowerCase()}`} style={{
      padding: 'var(--space-sm) var(--space-md)',
      textDecoration: 'none',
      color: active ? 'white' : 'var(--cool-gray)',
      fontSize: '13px',
      fontWeight: 600,
      position: 'relative',
      transition: 'all 0.3s ease',
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--ocean-gradient)' : 'rgba(255,255,255,0.1)',
      border: active ? 'none' : '1px solid rgba(255,255,255,0.2)',
      backdropFilter: active ? 'none' : 'blur(10px)',
      boxShadow: active ? 'var(--shadow-md)' : 'none'
    }}>
      {label}
      {badge && (
        <span style={{
          position: 'absolute',
          top: 0,
          right: '8px',
          background: 'var(--coral)',
          color: 'white',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 700
        }}>
          {badge}
        </span>
      )}
    </a>
  );
}