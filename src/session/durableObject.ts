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

export interface OtpState {
  code: string;
  email: string;
  createdAt: number;
  attempts: number;
  magicToken: string;
  deviceId: string;
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

  private generateMagicToken(): string {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async saveOtp(email: string, deviceId: string): Promise<OtpState> {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    // Generate 6-digit zero-padded code from random bytes
    const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    const code = String(num % 1000000).padStart(6, "0");

    const otp: OtpState = {
      code,
      email,
      createdAt: Date.now(),
      attempts: 0,
      magicToken: this.generateMagicToken(),
      deviceId,
    };

    await this.ctx.storage.put<OtpState>("otp", otp);
    return otp;
  }

  async verifyOtp(
    code: string,
  ): Promise<{ valid: boolean; email?: string; expired?: boolean; locked?: boolean }> {
    const otp = await this.ctx.storage.get<OtpState>("otp");

    if (!otp) {
      return { valid: false };
    }

    // Check lockout (5 attempts max)
    if (otp.attempts >= 5) {
      return { valid: false, locked: true };
    }

    // Check TTL (10 minutes)
    if (Date.now() - otp.createdAt > 10 * 60 * 1000) {
      await this.clearOtp();
      return { valid: false, expired: true };
    }

    // Constant-time comparison: always check all characters
    const a = new TextEncoder().encode(otp.code);
    const b = new TextEncoder().encode(code.padStart(6, "0").slice(0, 6));
    let mismatch = a.length !== b.length ? 1 : 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      mismatch |= a[i] ^ b[i];
    }

    if (mismatch !== 0) {
      otp.attempts += 1;
      await this.ctx.storage.put<OtpState>("otp", otp);
      if (otp.attempts >= 5) {
        return { valid: false, locked: true };
      }
      return { valid: false };
    }

    // Success: clear OTP (single use)
    await this.clearOtp();
    return { valid: true, email: otp.email };
  }

  async verifyMagicToken(
    token: string,
    submittedDeviceId: string,
  ): Promise<{ valid: boolean; email?: string; expired?: boolean; sameDevice?: boolean }> {
    const otp = await this.ctx.storage.get<OtpState>("otp");

    if (!otp || !otp.magicToken) {
      return { valid: false };
    }

    // Check TTL (10 minutes)
    if (Date.now() - otp.createdAt > 10 * 60 * 1000) {
      await this.clearOtp();
      return { valid: false, expired: true };
    }

    // Constant-time comparison (XOR-based, no early exit)
    const a = new TextEncoder().encode(otp.magicToken);
    const b = new TextEncoder().encode(token);
    let mismatch = a.length !== b.length ? 1 : 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      mismatch |= a[i] ^ b[i];
    }

    if (mismatch !== 0) {
      return { valid: false };
    }

    const sameDevice = otp.deviceId === submittedDeviceId;

    // Same-device: clear OTP state (single use)
    // Cross-device: keep OTP so user can still enter code on original device
    if (sameDevice) {
      await this.clearOtp();
    }

    return { valid: true, email: otp.email, sameDevice };
  }

  async clearOtp(): Promise<void> {
    await this.ctx.storage.delete("otp");
  }
}
