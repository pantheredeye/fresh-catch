import type { SessionPayload } from "./features/auth/session";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAILS: string;
  APP_URL: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  // Optional: Stripe payments (#60). Unset = payments off; the rest of the
  // app (confirm order, mark paid in person) works without them.
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CONNECT_ACCOUNT_ID?: string;
  // Optional: no local emulation (C9). Falls back to a non-AI draft path
  // when unset — see features/catch/pipeline.ts.
  AI?: Ai;
};

export type Variables = {
  session: SessionPayload | null;
  deviceToken: string;
};
