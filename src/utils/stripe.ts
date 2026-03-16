/**
 * Stripe utilities — Workers-compatible client setup
 */
import Stripe from "stripe";

let cryptoProvider: Stripe.CryptoProvider | null = null;

/**
 * Create a Stripe client instance compatible with Cloudflare Workers.
 * Uses fetch-based HTTP client instead of Node's http module.
 */
export function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2025-04-30.basil",
  });
}

/**
 * Get a singleton SubtleCryptoProvider for webhook signature verification.
 * Uses Web Crypto API (available in Workers) instead of Node crypto.
 */
export function getCryptoProvider(): Stripe.CryptoProvider {
  if (!cryptoProvider) {
    cryptoProvider = Stripe.createSubtleCryptoProvider();
  }
  return cryptoProvider;
}
