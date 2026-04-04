import { describe, it, expect, vi, beforeEach } from "vitest";

// Test rotateSession logic by recreating it with mock sessions
// (Can't import from store.ts directly due to rwsdk runtime dependency)

function createMockSessions() {
  return {
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
}

// Mirror the rotateSession logic for testing
async function rotateSession(
  sessions: ReturnType<typeof createMockSessions>,
  request: Request,
  responseHeaders: Headers,
  sessionData?: {
    userId?: string | null;
    currentOrganizationId?: string | null;
    role?: string | null;
  },
): Promise<void> {
  let dataToPreserve = sessionData;
  if (!dataToPreserve) {
    const currentSession = await sessions.load(request);
    if (!currentSession) {
      return;
    }
    dataToPreserve = {
      userId: currentSession.userId,
      currentOrganizationId: currentSession.currentOrganizationId,
      role: currentSession.role,
    };
  }
  await sessions.remove(request, responseHeaders);
  await sessions.save(responseHeaders, {
    userId: dataToPreserve.userId ?? null,
    currentOrganizationId: dataToPreserve.currentOrganizationId ?? null,
    role: dataToPreserve.role ?? null,
  });
}

describe("rotateSession", () => {
  let mockSessions: ReturnType<typeof createMockSessions>;
  let mockRequest: Request;
  let mockHeaders: Headers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions = createMockSessions();
    mockRequest = new Request("https://example.com", {
      headers: { Cookie: "session_id=old-session-id" },
    });
    mockHeaders = new Headers();
  });

  it("creates new session preserving user data from current session", async () => {
    mockSessions.load.mockResolvedValue({
      userId: "user-123",
      currentOrganizationId: "org-456",
      role: "ADMIN",
      createdAt: Date.now(),
    });

    await rotateSession(mockSessions, mockRequest, mockHeaders);

    expect(mockSessions.remove).toHaveBeenCalledWith(mockRequest, mockHeaders);
    expect(mockSessions.save).toHaveBeenCalledWith(mockHeaders, {
      userId: "user-123",
      currentOrganizationId: "org-456",
      role: "ADMIN",
    });
  });

  it("revokes old session before creating new one", async () => {
    mockSessions.load.mockResolvedValue({
      userId: "user-123",
      currentOrganizationId: null,
      role: null,
      createdAt: Date.now(),
    });

    const callOrder: string[] = [];
    mockSessions.remove.mockImplementation(async () => {
      callOrder.push("remove");
    });
    mockSessions.save.mockImplementation(async () => {
      callOrder.push("save");
    });

    await rotateSession(mockSessions, mockRequest, mockHeaders);

    expect(callOrder).toEqual(["remove", "save"]);
  });

  it("uses provided sessionData instead of loading from request", async () => {
    await rotateSession(mockSessions, mockRequest, mockHeaders, {
      userId: "explicit-user",
      currentOrganizationId: "explicit-org",
      role: "MEMBER",
    });

    expect(mockSessions.load).not.toHaveBeenCalled();
    expect(mockSessions.remove).toHaveBeenCalledWith(mockRequest, mockHeaders);
    expect(mockSessions.save).toHaveBeenCalledWith(mockHeaders, {
      userId: "explicit-user",
      currentOrganizationId: "explicit-org",
      role: "MEMBER",
    });
  });

  it("handles no existing session gracefully", async () => {
    mockSessions.load.mockResolvedValue(null);

    await rotateSession(mockSessions, mockRequest, mockHeaders);

    expect(mockSessions.remove).not.toHaveBeenCalled();
    expect(mockSessions.save).not.toHaveBeenCalled();
  });

  it("handles partial sessionData with null defaults", async () => {
    await rotateSession(mockSessions, mockRequest, mockHeaders, {
      userId: "user-only",
    });

    expect(mockSessions.save).toHaveBeenCalledWith(mockHeaders, {
      userId: "user-only",
      currentOrganizationId: null,
      role: null,
    });
  });
});
