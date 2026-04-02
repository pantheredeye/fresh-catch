type CatchData = {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
  updatedAt: string; // ISO date string
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FreshSheet({ catch: catchData, vendorSlug }: { catch: CatchData; vendorSlug?: string }) {
  return (
    <div style={{
      width: 'calc(100% - var(--space-md) * 2)',
      maxWidth: 'var(--width-md)',
      margin: 'var(--space-md) auto',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      background: 'var(--color-gradient-primary)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
      color: 'white'
    }}>
      {/* Label */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        opacity: 0.85,
        marginBottom: 'var(--space-sm)',
        textAlign: 'center' as const
      }}>
        This Week's Catch
      </div>

      {/* Headline */}
      <h2 style={{
        fontSize: 'var(--font-size-4xl)',
        fontWeight: 'var(--font-weight-bold)',
        lineHeight: 'var(--line-height-tight)',
        margin: '0 0 var(--space-lg) 0',
        fontFamily: 'var(--font-display)',
        textAlign: 'center' as const
      }}>
        {catchData.headline}
      </h2>

      {/* Items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-lg)'
      }}>
        {catchData.items.map((item, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: 'var(--font-size-md)',
            lineHeight: 'var(--line-height-normal)'
          }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{item.name}</span>
            {item.note && <span> — {item.note}</span>}
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        opacity: 0.7,
        textAlign: 'center' as const,
        marginBottom: 'var(--space-md)'
      }}>
        Updated {relativeTime(catchData.updatedAt)}
      </div>

      {/* Order Now CTA */}
      <div style={{ textAlign: 'center' as const }}>
        <a
          href={vendorSlug ? `/orders/new?b=${vendorSlug}` : "/orders/new"}
          style={{
            display: 'inline-block',
            padding: 'var(--space-sm) var(--space-xl)',
            background: 'var(--color-action-secondary)',
            color: 'white',
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
