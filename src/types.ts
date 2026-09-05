import type { SessionPayload } from "./features/auth/session";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAILS: string;
  APP_URL: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  // Optional: no local emulation (C9). Falls back to a non-AI draft path
  // when unset — see features/catch/pipeline.ts.
  AI?: Ai;
};

export type Variables = {
  session: SessionPayload | null;
  deviceToken: string;
};
