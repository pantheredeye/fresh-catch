/**
 * Stripe client for Cloudflare Workers — carried from v1 (`git show
 * main:src/utils/stripe.ts`). Workers have no Node `http` or `crypto`
 * modules, so the SDK needs its fetch-based HTTP client and the
 * SubtleCrypto provider for webhook signature verification.
 */
import Stripe from "stripe";

let cryptoProvider: Stripe.CryptoProvider | null = null;

export function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2026-02-25.clover",
  });
}

/** Singleton — building the provider is cheap but not free, and it's stateless. */
export function getCryptoProvider(): Stripe.CryptoProvider {
  if (!cryptoProvider) {
    cryptoProvider = Stripe.createSubtleCryptoProvider();
  }
  return cryptoProvider;
}
