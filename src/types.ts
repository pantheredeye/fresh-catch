export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAILS: string;
  APP_URL: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
};
