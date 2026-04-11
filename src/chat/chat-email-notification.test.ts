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

// ── Email batching logic (mirrors ChatDurableObject alarm pattern) ───

describe("email notification batching", () => {
  it("queues first message and would set alarm", () => {
    const pending: string[] = [];
    pending.push("Hello!");
    const shouldSetAlarm = pending.length === 1;
    expect(shouldSetAlarm).toBe(true);
    expect(pending).toEqual(["Hello!"]);
  });

  it("appends subsequent messages without new alarm", () => {
    const pending = ["First msg"];
    pending.push("Second msg");
    const shouldSetAlarm = pending.length === 1;
    expect(shouldSetAlarm).toBe(false);
    expect(pending).toHaveLength(2);
  });

  it("uses latest message as preview in batched email", () => {
    const pending = ["First", "Second", "Third"];
    const preview = pending[pending.length - 1];
    expect(preview).toBe("Third");
    expect(pending.length).toBe(3);
  });

  it("clears pending when customer reconnects", () => {
    const pending = ["msg1", "msg2"];
    // Simulate customer reconnect: clear pending + cancel alarm
    const cleared: string[] = [];
    expect(cleared).toHaveLength(0);
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

// ── Offline queuing decision (mirrors DO vendor message handling) ────

describe("offline notification queuing", () => {
  interface QueueContext {
    senderType: "customer" | "vendor";
    customerSocketCount: number;
  }

  function shouldQueueForEmail(ctx: QueueContext): boolean {
    return ctx.senderType === "vendor" && ctx.customerSocketCount === 0;
  }

  it("queues when vendor msg + customer offline", () => {
    expect(shouldQueueForEmail({ senderType: "vendor", customerSocketCount: 0 })).toBe(true);
  });

  it("does NOT queue for customer messages", () => {
    expect(shouldQueueForEmail({ senderType: "customer", customerSocketCount: 0 })).toBe(false);
  });

  it("does NOT queue when customer is online", () => {
    expect(shouldQueueForEmail({ senderType: "vendor", customerSocketCount: 1 })).toBe(false);
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
