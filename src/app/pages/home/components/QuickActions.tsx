type QuickAction = {
  icon: string;
  title: string;
  href: string;
};

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * QuickActions - Grid of quick access shortcuts
 *
 * WHY: Provides fast navigation to common tasks.
 * Color-coded borders help with visual scanning and memorization.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div style={{
      padding: '0 var(--space-md) var(--space-xl)',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-md)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {actions.map((action, index) => (
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
