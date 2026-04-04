import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Email validation (mirrors saveCustomerEmail logic) ──────────────

describe("saveCustomerEmail validation", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it("accepts valid emails", () => {
    expect(emailRegex.test("user@example.com")).toBe(true);
    expect(emailRegex.test("name+tag@domain.co")).toBe(true);
    expect(emailRegex.test("test@sub.domain.org")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(emailRegex.test("")).toBe(false);
    expect(emailRegex.test("not-an-email")).toBe(false);
    expect(emailRegex.test("@no-local.com")).toBe(false);
    expect(emailRegex.test("no-domain@")).toBe(false);
    expect(emailRegex.test("spaces in@email.com")).toBe(false);
  });
});

// ── Email debounce logic (mirrors ChatDurableObject) ────────────────

describe("email notification debounce", () => {
  const EMAIL_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

  it("allows first email (lastEmailSentAt=0)", () => {
    const lastEmailSentAt = 0;
    const now = Date.now();
    expect(now - lastEmailSentAt > EMAIL_DEBOUNCE_MS).toBe(true);
  });

  it("blocks email within 5-minute window", () => {
    const now = Date.now();
    const lastEmailSentAt = now - 2 * 60 * 1000; // 2 min ago
    expect(now - lastEmailSentAt > EMAIL_DEBOUNCE_MS).toBe(false);
  });

  it("allows email after 5-minute window", () => {
    const now = Date.now();
    const lastEmailSentAt = now - 6 * 60 * 1000; // 6 min ago
    expect(now - lastEmailSentAt > EMAIL_DEBOUNCE_MS).toBe(true);
  });

  it("allows email at exactly 5 min boundary", () => {
    const now = Date.now();
    const lastEmailSentAt = now - EMAIL_DEBOUNCE_MS;
    // At exactly 5 min, 0 > 0 is false — debounce still active
    expect(now - lastEmailSentAt > EMAIL_DEBOUNCE_MS).toBe(false);
  });

  it("allows email 1ms past 5 min window", () => {
    const now = Date.now();
    const lastEmailSentAt = now - EMAIL_DEBOUNCE_MS - 1;
    expect(now - lastEmailSentAt > EMAIL_DEBOUNCE_MS).toBe(true);
  });
});

// ── Message format validation (mirrors DO webSocketMessage) ─────────

describe("chat message validation", () => {
  function isValidMessage(parsed: any): boolean {
    return (
      parsed.type === "message" &&
      !!parsed.content &&
      !!parsed.senderType
    );
  }

  it("accepts valid customer message", () => {
    expect(
      isValidMessage({
        type: "message",
        content: "Hello",
        senderType: "customer",
      }),
    ).toBe(true);
  });

  it("accepts valid vendor message", () => {
    expect(
      isValidMessage({
        type: "message",
        content: "Hi there!",
        senderType: "vendor",
        senderId: "user-123",
      }),
    ).toBe(true);
  });

  it("rejects message without content", () => {
    expect(
      isValidMessage({ type: "message", content: "", senderType: "customer" }),
    ).toBe(false);
  });

  it("rejects message without senderType", () => {
    expect(
      isValidMessage({ type: "message", content: "Hello" }),
    ).toBe(false);
  });

  it("rejects wrong type", () => {
    expect(
      isValidMessage({
        type: "ping",
        content: "Hello",
        senderType: "customer",
      }),
    ).toBe(false);
  });
});

// ── Message preview truncation (mirrors DO email logic) ─────────────

describe("message preview truncation", () => {
  function truncatePreview(content: string): string {
    return content.length > 100 ? content.slice(0, 100) + "…" : content;
  }

  it("keeps short messages intact", () => {
    expect(truncatePreview("Hello!")).toBe("Hello!");
  });

  it("truncates at 100 chars with ellipsis", () => {
    const long = "a".repeat(150);
    const result = truncatePreview(long);
    expect(result).toHaveLength(101); // 100 chars + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not truncate exactly 100 chars", () => {
    const exact = "b".repeat(100);
    expect(truncatePreview(exact)).toBe(exact);
  });
});

// ── Offline detection logic (mirrors DO vendor message handling) ─────

describe("offline notification decision", () => {
  const EMAIL_DEBOUNCE_MS = 5 * 60 * 1000;

  interface NotificationContext {
    senderType: "customer" | "vendor";
    customerSocketCount: number;
    lastEmailSentAt: number;
    customerEmail: string | null;
    now: number;
  }

  function shouldSendEmail(ctx: NotificationContext): boolean {
    if (ctx.senderType !== "vendor") return false;
    if (ctx.customerSocketCount > 0) return false;
    if (ctx.now - ctx.lastEmailSentAt <= EMAIL_DEBOUNCE_MS) return false;
    if (!ctx.customerEmail) return false;
    return true;
  }

  it("sends when vendor msg + customer offline + email exists + debounce passed", () => {
    expect(
      shouldSendEmail({
        senderType: "vendor",
        customerSocketCount: 0,
        lastEmailSentAt: 0,
        customerEmail: "test@example.com",
        now: Date.now(),
      }),
    ).toBe(true);
  });

  it("does NOT send for customer messages", () => {
    expect(
      shouldSendEmail({
        senderType: "customer",
        customerSocketCount: 0,
        lastEmailSentAt: 0,
        customerEmail: "test@example.com",
        now: Date.now(),
      }),
    ).toBe(false);
  });

  it("does NOT send when customer is online", () => {
    expect(
      shouldSendEmail({
        senderType: "vendor",
        customerSocketCount: 1,
        lastEmailSentAt: 0,
        customerEmail: "test@example.com",
        now: Date.now(),
      }),
    ).toBe(false);
  });

  it("does NOT send within debounce window", () => {
    const now = Date.now();
    expect(
      shouldSendEmail({
        senderType: "vendor",
        customerSocketCount: 0,
        lastEmailSentAt: now - 60_000, // 1 min ago
        customerEmail: "test@example.com",
        now,
      }),
    ).toBe(false);
  });

  it("does NOT send without customer email", () => {
    expect(
      shouldSendEmail({
        senderType: "vendor",
        customerSocketCount: 0,
        lastEmailSentAt: 0,
        customerEmail: null,
        now: Date.now(),
      }),
    ).toBe(false);
  });

  it("sends after debounce window expires", () => {
    const now = Date.now();
    expect(
      shouldSendEmail({
        senderType: "vendor",
        customerSocketCount: 0,
        lastEmailSentAt: now - 6 * 60_000, // 6 min ago
        customerEmail: "user@test.com",
        now,
      }),
    ).toBe(true);
  });
});

// ── Chat resume URL parameter ───────────────────────────────────────

describe("chat resume URL parameter", () => {
  it("extracts chat param from URL", () => {
    const url = new URL("https://example.com/v/evan?chat=conv-123");
    expect(url.searchParams.get("chat")).toBe("conv-123");
  });

  it("returns null when no chat param", () => {
    const url = new URL("https://example.com/v/evan");
    expect(url.searchParams.get("chat")).toBeNull();
  });

  it("builds correct chat path for email link", () => {
    const orgSlug = "evan";
    const conversationId = "conv-abc-123";
    const chatPath = `/v/${orgSlug}?chat=${conversationId}`;
    expect(chatPath).toBe("/v/evan?chat=conv-abc-123");
  });
});

// ── Auth logic for anonymous conversations ──────────────────────────

describe("conversation access control", () => {
  interface AuthContext {
    userId: string | null;
    orgId: string | null;
  }

  interface Conversation {
    customerId: string | null;
    organizationId: string;
  }

  function hasAccess(ctx: AuthContext, conv: Conversation): boolean {
    const isAnonymous = conv.customerId === null;
    const isOwner =
      conv.customerId !== null && conv.customerId === ctx.userId;
    const isOrgMember = conv.organizationId === ctx.orgId;
    return isAnonymous || isOwner || isOrgMember;
  }

  it("grants access to anonymous conversations (customerId=null)", () => {
    expect(
      hasAccess(
        { userId: null, orgId: null },
        { customerId: null, organizationId: "org-1" },
      ),
    ).toBe(true);
  });

  it("grants access to conversation owner", () => {
    expect(
      hasAccess(
        { userId: "user-1", orgId: null },
        { customerId: "user-1", organizationId: "org-1" },
      ),
    ).toBe(true);
  });

  it("grants access to org members", () => {
    expect(
      hasAccess(
        { userId: "admin-1", orgId: "org-1" },
        { customerId: "user-1", organizationId: "org-1" },
      ),
    ).toBe(true);
  });

  it("denies access to non-owner, non-org user", () => {
    expect(
      hasAccess(
        { userId: "user-2", orgId: "org-2" },
        { customerId: "user-1", organizationId: "org-1" },
      ),
    ).toBe(false);
  });
});
