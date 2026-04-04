import { MAX_SESSION_DURATION } from "rwsdk/auth";
import { DurableObject } from "cloudflare:workers";

export interface Session {
  userId?: string | null;
  challenge?: string | null;
  challengeCreatedAt?: number | null;
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

  async saveSession({
    userId = null,
    challenge = null,
    currentOrganizationId = null,
    role = null,
    csrfToken,
  }: {
    userId?: string | null;
    challenge?: string | null;
    currentOrganizationId?: string | null;
    role?: string | null;
    csrfToken?: string;
  }): Promise<Session> {
    const session: Session = {
      userId,
      challenge,
      challengeCreatedAt: challenge ? Date.now() : null,
      createdAt: Date.now(),
      currentOrganizationId,
      role,
      // Preserve existing CSRF token on session updates; generate fresh one for new sessions
      csrfToken: csrfToken ?? this.session?.csrfToken ?? this.generateCsrfToken(),
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

    if (session.createdAt + MAX_SESSION_DURATION < Date.now()) {
      await this.revokeSession();
      return {
        error: "Session expired",
      };
    }

    // Backfill csrfToken for sessions created before CSRF support
    if (!session.csrfToken) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      session.csrfToken = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
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
