type Vendor = {
  name: string;
  slug: string;
};

interface VendorDirectoryProps {
  vendors: Vendor[];
}

/**
 * VendorDirectory - Grid of vendor cards for multi-vendor home page.
 * Each card links to /v/{slug} to set the browsing context.
 */
export function VendorDirectory({ vendors }: VendorDirectoryProps) {
  if (vendors.length === 0) return null;

  return (
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: 'var(--space-lg) var(--space-md)',
    }}>
      <h1 style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-lg)',
        textAlign: 'center',
      }}>
        Choose a vendor
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 'var(--space-md)',
      }}>
        {vendors.map((vendor) => (
          <a
            key={vendor.slug}
            href={`/v/${vendor.slug}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'var(--color-surface-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border-light)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              minHeight: '120px',
            }}
            className="card"
          >
            <span style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-md)',
            }}>
              {vendor.name}
            </span>
            <span style={{
              color: 'var(--color-action-primary)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-md)',
            }}>
              Visit →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
