import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { db } from "@/db";
import { NotAuthenticated, AccessDenied, NoOrganization } from "../components";
import { MessagesUI } from "./MessagesUI";

export async function MessagesPage({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const orgId = ctx.currentOrganization.id;

  const conversations = await db.conversation.findMany({
    where: { organizationId: orgId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Count unread customer messages per conversation
  const unreadCounts = await db.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderType: "customer",
      readAt: null,
    },
    _count: { id: true },
  });

  const countMap = new Map(
    unreadCounts.map((u) => [u.conversationId, u._count.id]),
  );

  const rows = conversations.map((conv) => {
    const lastMessage = conv.messages[0] ?? null;
    return {
      id: conv.id,
      customerName: conv.customerName,
      customerPhone: conv.customerPhone,
      status: conv.status,
      lastMessagePreview: lastMessage?.content ?? null,
      lastMessageSenderType: (lastMessage?.senderType ?? null) as
        | "customer"
        | "vendor"
        | null,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: countMap.get(conv.id) ?? 0,
    };
  });

  return <MessagesUI organizationId={orgId} initialConversations={rows} />;
}
