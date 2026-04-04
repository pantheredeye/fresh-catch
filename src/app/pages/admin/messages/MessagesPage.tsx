import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { db } from "@/db";
import { NotAuthenticated, AccessDenied, NoOrganization } from "../components";

export async function MessagesPage({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const conversations = await db.conversation.findMany({
    where: { organizationId: ctx.currentOrganization.id },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  const rows = conversations.map((conv) => {
    const lastMessage = conv.messages[0] ?? null;
    return {
      id: conv.id,
      customerName: conv.customerName,
      customerPhone: conv.customerPhone,
      status: conv.status,
      messageCount: conv._count.messages,
      lastMessagePreview: lastMessage?.content ?? null,
      lastMessageSenderType: lastMessage?.senderType ?? null,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
    };
  });

  return (
    <div>
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Messages
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            margin: "var(--space-xs) 0 0",
          }}
        >
          {rows.length} conversation{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-2xl)",
            color: "var(--color-text-tertiary)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-lg)", margin: 0 }}>
            No conversations yet
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", marginTop: "var(--space-sm)" }}>
            Customer messages will appear here
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {rows.map((conv) => (
            <a
              key={conv.id}
              href={`/admin/messages/${conv.id}`}
              style={{
                display: "block",
                padding: "var(--space-md)",
                background: "var(--color-surface-primary)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-sm)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--font-size-md)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {conv.customerName}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: conv.status === "open"
                        ? "var(--color-status-success)"
                        : "var(--color-text-tertiary)",
                      fontWeight: 500,
                    }}
                  >
                    {conv.status}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {conv.lastMessagePreview && (
                <p
                  style={{
                    margin: "var(--space-xs) 0 0",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conv.lastMessageSenderType === "vendor" ? "You: " : ""}
                  {conv.lastMessagePreview.length > 80
                    ? conv.lastMessagePreview.slice(0, 80) + "\u2026"
                    : conv.lastMessagePreview}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
