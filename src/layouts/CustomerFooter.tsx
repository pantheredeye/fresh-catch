/**
 * CustomerFooter - Footer for customer pages
 *
 * WHY: Provides branding and credits at bottom of page.
 * Designed to work with lifting bottom navigation.
 */
export function CustomerFooter() {
  return (
    <footer
      className="customer-footer"
      style={{
        background: 'var(--footer-background)',
        padding: 'var(--space-xl) var(--space-md)',
        textAlign: 'center',
      }}
    >
      <p style={{
        margin: 0,
        fontSize: '14px',
        color: 'var(--cool-gray)',
      }}>
        Made by{' '}
        <a
          href="https://digitalglue.co"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--ocean-blue)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Digital Glue
        </a>
      </p>
    </footer>
  );
}
