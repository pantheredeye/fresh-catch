/**
 * Header - Customer home page header with branding and quick order CTA
 *
 * WHY: Sticky glassmorphic header for brand consistency and quick access.
 * Uses ocean gradient for brand name, coral gradient for CTA button.
 */
export function Header() {
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
