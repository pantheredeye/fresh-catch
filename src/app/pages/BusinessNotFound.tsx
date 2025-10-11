import { Container } from "@/design-system/components/Container";
import { Button } from "@/design-system/components/Button";
import "@/design-system/tokens.css";

/**
 * BusinessNotFound - Error page for invalid business slugs
 *
 * Shown when user visits /?b=invalid-slug
 * Uses admin page design pattern: clean, professional, helpful
 */
export function BusinessNotFound({ businessSlug }: { businessSlug: string }) {
  return (
    <Container>
      <div style={{
        colorScheme: 'light', // Force light mode rendering
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        background: 'var(--warm-white, #FFFCF8)',
      }}>
        <div style={{
          background: 'white',
          background: 'var(--surface-primary, white)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-2xl)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--soft-gray, #E0E0E0)',
          textAlign: 'center'
        }}>
          {/* Icon */}
          <div style={{
            fontSize: '64px',
            marginBottom: 'var(--space-lg)',
            filter: 'saturate(0.7)',
            opacity: 0.8
          }}>
            🔍
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1A1A2E',
            color: 'var(--deep-navy, #1A1A2E)',
            fontFamily: 'var(--font-display)',
            marginBottom: 'var(--space-md)',
            margin: 0
          }}>
            Business Not Found
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '16px',
            color: '#6B7280',
            color: 'var(--cool-gray, #6B7280)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-xl)'
          }}>
            We couldn't find a business with the identifier <strong style={{
              color: '#1A1A2E',
              color: 'var(--deep-navy, #1A1A2E)',
            }}>"{businessSlug}"</strong>.
          </p>

          {/* Actions */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.location.href = '/'}
            >
              Go to Homepage
            </Button>

            <a
              href="/admin/setup"
              style={{
                color: '#0066CC',
                color: 'var(--ocean-blue, #0066CC)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                padding: 'var(--space-sm)'
              }}
            >
              Are you a business owner? Sign up →
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
}
