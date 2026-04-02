type PopupData = {
  name: string;
  schedule: string;
  expiresAt: string; // ISO date string
  locationDetails?: string | null;
  customerInfo?: string | null;
  catchPreview?: { items: { name: string; note?: string }[] } | null;
};

function getDateBadge(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const expiresStr = expires.toISOString().slice(0, 10);

  if (expiresStr === todayStr) return "TODAY!";
  if (expiresStr === tomorrowStr) return "TOMORROW!";
  return expires.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function PopupCard({ popup, vendorSlug }: { popup: PopupData; vendorSlug?: string }) {
  const badge = getDateBadge(popup.expiresAt);
  const isUrgent = badge === "TODAY!" || badge === "TOMORROW!";

  return (
    <div style={{
      background: 'var(--color-gradient-secondary)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-coral)',
      position: 'relative',
      overflow: 'hidden',
      color: 'white'
    }}>
      {/* Urgency Badge */}
      <div style={{
        position: 'absolute',
        top: 'var(--space-md)',
        right: 'var(--space-md)',
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-full)',
        padding: 'var(--space-xs) var(--space-md)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-bold)',
        letterSpacing: '0.05em',
        ...(isUrgent ? { animation: 'pulse 2s ease-in-out infinite' } : {})
      }}>
        {badge}
      </div>

      {/* Popup Label */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        opacity: 0.85,
        marginBottom: 'var(--space-sm)'
      }}>
        Popup Market
      </div>

      {/* Market Name */}
      <h3 style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 'var(--font-weight-bold)',
        lineHeight: 'var(--line-height-tight)',
        margin: '0 0 var(--space-xs) 0',
        paddingRight: 'var(--space-2xl)',
        fontFamily: 'var(--font-display)'
      }}>
        {popup.name}
      </h3>

      {/* Schedule */}
      <div style={{
        fontSize: 'var(--font-size-md)',
        fontWeight: 'var(--font-weight-semibold)',
        opacity: 0.9,
        marginBottom: popup.locationDetails ? 'var(--space-xs)' : 'var(--space-md)'
      }}>
        {popup.schedule}
      </div>

      {/* Location */}
      {popup.locationDetails && (
        <div style={{
          fontSize: 'var(--font-size-sm)',
          opacity: 0.8,
          marginBottom: 'var(--space-md)'
        }}>
          {popup.locationDetails}
        </div>
      )}

      {/* Catch Preview */}
      {popup.catchPreview && popup.catchPreview.items.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 'var(--space-xs)',
          marginBottom: 'var(--space-md)'
        }}>
          {popup.catchPreview.items.map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-md)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-normal)'
            }}>
              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{item.name}</span>
              {item.note && <span> — {item.note}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Customer Info */}
      {popup.customerInfo && (
        <div style={{
          fontSize: 'var(--font-size-xs)',
          opacity: 0.7,
          marginBottom: 'var(--space-md)'
        }}>
          {popup.customerInfo}
        </div>
      )}

      {/* Order Now CTA */}
      <div style={{ textAlign: 'center' as const }}>
        <a
          href={vendorSlug ? `/orders/new?b=${vendorSlug}` : "/orders/new"}
          style={{
            display: 'inline-block',
            padding: 'var(--space-sm) var(--space-xl)',
            background: 'rgba(255,255,255,0.95)',
            color: 'var(--color-action-secondary)',
            borderRadius: 'var(--radius-lg)',
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--font-size-md)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          Order Now
        </a>
      </div>
    </div>
  );
}
