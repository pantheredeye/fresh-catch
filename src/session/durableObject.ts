import { DurableObject } from "cloudflare:workers";

// Invariant: the session DO stores auth state ONLY (who you are, which org,
// CSRF token). Login codes are email-keyed in D1 (src/auth/login-codes.ts);
// anonymous product state (drafts, favorites) lives client-side.
export interface Session {
  userId?: string | null;
  createdAt: number;
  currentOrganizationId?: string | null;
  role?: string | null;
  csrfToken: string;
}

export class SessionDurableObject extends DurableObject {
  private session: Session | undefined = undefined;
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.session = undefined;
  }

  private generateCsrfToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Base64url-encode for safe embedding in HTML and headers
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async saveSession(data: {
    userId?: string | null;
    currentOrganizationId?: string | null;
    role?: string | null;
    csrfToken?: string;
  }): Promise<Session> {
    // Merge with existing session to avoid wiping auth state
    // when only updating a single field
    const existing = this.session ?? await this.ctx.storage.get<Session>("session");

    const session: Session = {
      userId: data.userId !== undefined ? data.userId : (existing?.userId ?? null),
      createdAt: existing?.createdAt ?? Date.now(),
      currentOrganizationId: data.currentOrganizationId !== undefined
        ? data.currentOrganizationId
        : (existing?.currentOrganizationId ?? null),
      role: data.role !== undefined ? data.role : (existing?.role ?? null),
      csrfToken: data.csrfToken ?? existing?.csrfToken ?? this.generateCsrfToken(),
    };

    await this.ctx.storage.put<Session>("session", session);
    this.session = session;
    return session;
  }

  async getSession(): Promise<{ value: Session } | { error: string }> {
    if (this.session) {
      return { value: this.session };
    }

    const session = await this.ctx.storage.get<Session>("session");

    if (!session) {
      return {
        error: "Invalid session",
      };
    }

    // Backfill csrfToken for sessions created before CSRF support
    if (!session.csrfToken) {
      session.csrfToken = this.generateCsrfToken();
      await this.ctx.storage.put<Session>("session", session);
    }

    this.session = session;
    return { value: session };
  }

  async revokeSession() {
    await this.ctx.storage.delete("session");
    this.session = undefined;
  }
}
