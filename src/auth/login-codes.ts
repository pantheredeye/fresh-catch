import { db } from "@/db";
import { sha256Hex } from "@/utils/hash";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1000000).padStart(6, "0");
}

/**
 * Create (or replace) the active login code for an email.
 * One active code per email; resending invalidates the previous code.
 */
export async function createLoginCode(email: string): Promise<string> {
  const code = generateCode();
  const emailHash = await sha256Hex(normalizeEmail(email));
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.loginCode.upsert({
    where: { emailHash },
    create: { emailHash, codeHash, expiresAt },
    update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
  });

  return code;
}

export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<{ valid: boolean; email?: string; expired?: boolean; locked?: boolean }> {
  const normalized = normalizeEmail(email);
  const emailHash = await sha256Hex(normalized);

  const record = await db.loginCode.findUnique({ where: { emailHash } });
  if (!record) return { valid: false };

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, locked: true };
  }

  if (record.expiresAt < new Date()) {
    await db.loginCode.delete({ where: { emailHash } }).catch(() => {});
    return { valid: false, expired: true };
  }

  const codeHash = await sha256Hex(code.trim());
  if (codeHash !== record.codeHash) {
    const updated = await db.loginCode.update({
      where: { emailHash },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, locked: updated.attempts >= MAX_ATTEMPTS };
  }

  // Single use
  await db.loginCode.delete({ where: { emailHash } }).catch(() => {});
  return { valid: true, email: normalized };
}
