/**
 * LiveBanner - Shows when market is currently live
 *
 * WHY: Creates urgency and indicates real-time availability.
 * Pulsing dot animation draws attention to live status.
 *
 * TODO: Connect to actual market live status instead of always showing
 */
export function LiveBanner() {
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
