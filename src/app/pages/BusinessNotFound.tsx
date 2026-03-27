"use client";

import { Container, Button } from "@/design-system";
import "@/layouts/AdminLayout.css";

/**
 * BusinessNotFound - Error page for invalid business slugs or no businesses
 *
 * Shown when:
 * - User visits /?b=invalid-slug (businessSlug provided)
 * - No businesses exist in the database yet (businessSlug is null)
 *
 * Uses admin page design pattern: clean, professional, helpful
 */
export function BusinessNotFound({ businessSlug }: { businessSlug: string | null }) {
  const isSpecificBusiness = businessSlug !== null;

  return (
    <Container>
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">
            {isSpecificBusiness ? '🔍' : '🏪'}
          </div>

          <h1 className="error-title">
            {isSpecificBusiness ? 'Business Not Found' : 'No Businesses Yet'}
          </h1>

          <p className="error-description">
            {isSpecificBusiness ? (
              <>We couldn't find a business with the identifier <strong>"{businessSlug}"</strong>.</>
            ) : (
              <>There are no businesses registered yet. Be the first to set up your business!</>
            )}
          </p>

          <div className="error-actions">
            {isSpecificBusiness ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => window.location.href = '/'}
                >
                  Go to Homepage
                </Button>

                <a href="/admin/setup" className="error-secondary-link">
                  Are you a business owner? Sign up →
                </a>
              </>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => window.location.href = '/admin/setup'}
              >
                Set Up Your Business
              </Button>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
