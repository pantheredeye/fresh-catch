type FreshCatch = {
  emoji: string;
  name: string;
};

interface FreshHeroProps {
  freshCatch: FreshCatch[];
}

/**
 * FreshHero - Hero section showcasing this week's fresh catch
 *
 * WHY: Visual merchandising to create excitement and show variety.
 * Ocean gradient background with glassmorphic cards for premium feel.
 * Grid layout for easy scanning of available fish.
 */
export function FreshHeroV1({ freshCatch }: FreshHeroProps) {
  return (
    <div style={{
      width: 'calc(100% - var(--space-md) * 2)',
      maxWidth: 'var(--width-md)',
      margin: 'var(--space-md) auto',
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
          fontSize: 'var(--font-size-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--letter-spacing-wider)',
          opacity: 0.9,
          marginBottom: 'var(--space-sm)'
        }}>
          This Week's Catch
        </div>
        <h2 style={{
          fontSize: 'var(--font-size-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          lineHeight: 'var(--line-height-tight)',
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
        {freshCatch.map((item, index) => (
          <div key={index} style={{
            background: 'var(--glass-white)',
            color: 'var(--color-text-primary)',
            padding: 'var(--space-md) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <span style={{
              display: 'block',
              fontSize: 'var(--font-size-3xl)',
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
