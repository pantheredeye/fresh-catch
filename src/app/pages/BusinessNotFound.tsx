"use client";

import { Container } from "@/design-system/components/Container";
import { Button } from "@/design-system/components/Button";
import "@/admin-design-system/admin-auth.css";

/**
 * BusinessNotFound - Error page for invalid business slugs
 *
 * Shown when user visits /?b=invalid-slug
 * Uses admin page design pattern: clean, professional, helpful
 */
export function BusinessNotFound({ businessSlug }: { businessSlug: string }) {
  return (
    <Container>
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">
            🔍
          </div>

          <h1 className="error-title">
            Business Not Found
          </h1>

          <p className="error-description">
            We couldn't find a business with the identifier <strong>"{businessSlug}"</strong>.
          </p>

          <div className="error-actions">
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
          </div>
        </div>
      </div>
    </Container>
  );
}
