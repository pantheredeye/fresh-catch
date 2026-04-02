"use client";

type PastPopup = {
  id: string;
  name: string;
  schedule: string;
  createdAt: string;
  expiresAt: string;
  locationDetails?: string | null;
  catchPreview?: string | null;
};

type ParsedCatchPreview = {
  items: { name: string; note?: string }[];
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getMonthGroup(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function parseCatchPreview(raw?: string | null): ParsedCatchPreview | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function PastPopupCard({ popup }: { popup: PastPopup }) {
  const catchPreview = parseCatchPreview(popup.catchPreview);
  const dateLabel = formatDate(popup.expiresAt || popup.createdAt);

  return (
    <div style={{
      background: 'var(--color-surface-secondary)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-lg)',
      marginBottom: 'var(--space-md)',
      border: '1px solid var(--color-border-subtle)',
    }}>
      {/* Date Badge */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: '0.05em',
        marginBottom: 'var(--space-xs)'
      }}>
        {dateLabel}
      </div>

      {/* Popup Label */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-xs)'
      }}>
        Popup Market
      </div>

      {/* Market Name */}
      <h3 style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-bold)',
        lineHeight: 'var(--line-height-tight)',
        margin: '0 0 var(--space-xs) 0',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-display)'
      }}>
        {popup.name}
      </h3>

      {/* Schedule */}
      <div style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        marginBottom: popup.locationDetails ? 'var(--space-xs)' : 'var(--space-sm)'
      }}>
        {popup.schedule}
      </div>

      {/* Location */}
      {popup.locationDetails && (
        <div style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-sm)'
        }}>
          📍 {popup.locationDetails}
        </div>
      )}

      {/* Catch Preview */}
      {catchPreview && catchPreview.items.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 'var(--space-xs)',
        }}>
          {catchPreview.items.map((item, i) => (
            <div key={i} style={{
              background: 'var(--color-surface-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
            }}>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                {item.name}
              </span>
              {item.note && <span> — {item.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthHeader({ label }: { label: string }) {
  return (
    <h2 style={{
      fontSize: 'var(--font-size-lg)',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-text-primary)',
      margin: '0',
      padding: 'var(--space-md) 0 var(--space-sm) 0',
      fontFamily: 'var(--font-display)'
    }}>
      {label}
    </h2>
  );
}

export function PastPopupsUI({ popups }: { popups: PastPopup[] }) {
  if (popups.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-xl)',
        textAlign: 'center' as const,
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: 'var(--space-md)'
        }}>
          🐟
        </div>
        <p style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-md)',
          margin: 0
        }}>
          No past popups yet
        </p>
      </div>
    );
  }

  const shouldGroup = popups.length > 10;

  if (!shouldGroup) {
    return (
      <div style={{ padding: 'var(--space-md)' }}>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-lg) 0',
          fontFamily: 'var(--font-display)'
        }}>
          Past Popups
        </h1>
        {popups.map(p => <PastPopupCard key={p.id} popup={p} />)}
      </div>
    );
  }

  // Group by month when >10 popups
  const grouped: { label: string; items: PastPopup[] }[] = [];
  let currentLabel = "";

  for (const popup of popups) {
    const label = getMonthGroup(popup.createdAt);
    if (label !== currentLabel) {
      grouped.push({ label, items: [] });
      currentLabel = label;
    }
    grouped[grouped.length - 1].items.push(popup);
  }

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <h1 style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)',
        margin: '0 0 var(--space-lg) 0',
        fontFamily: 'var(--font-display)'
      }}>
        Past Popups
      </h1>
      {grouped.map(group => (
        <div key={group.label}>
          <MonthHeader label={group.label} />
          {group.items.map(p => <PastPopupCard key={p.id} popup={p} />)}
        </div>
      ))}
    </div>
  );
}
