"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

export async function createConversation({
  customerName,
  customerPhone,
  organizationId,
}: {
  customerName: string;
  customerPhone?: string;
  organizationId: string;
}) {
  const { ctx } = requestInfo;
  const customerId = ctx.user?.id ?? null;

  const conversation = await db.conversation.create({
    data: {
      customerName,
      customerPhone,
      organizationId,
      customerId,
    },
  });

  return { conversationId: conversation.id };
}

export async function getMessages(
  conversationId: string,
  cursor?: string,
) {
  const { ctx } = requestInfo;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return { messages: [], nextCursor: null };
  }

  // Caller must be the customer or an org member
  if (
    conversation.customerId !== ctx.user?.id &&
    conversation.organizationId !== ctx.currentOrganization?.id
  ) {
    return { messages: [], nextCursor: null };
  }

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 51, // fetch one extra to determine if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > 50;
  const page = hasMore ? messages.slice(0, 50) : messages;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return { messages: page, nextCursor };
}

export async function getConversation(conversationId: string) {
  const { ctx } = requestInfo;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Caller must be the customer or an org member
  if (
    conversation.customerId !== ctx.user?.id &&
    conversation.organizationId !== ctx.currentOrganization?.id
  ) {
    return null;
  }

  // Return messages in chronological order
  conversation.messages.reverse();

  return conversation;
}

export async function getConversations(organizationId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  const conversations = await db.conversation.findMany({
    where: { organizationId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return conversations.map((conv) => {
    const lastMessage = conv.messages[0] ?? null;
    return {
      ...conv,
      lastMessagePreview: lastMessage?.content ?? null,
      lastMessageSenderType: lastMessage?.senderType ?? null,
      unreadCount: 0, // Will be filled below
      messages: undefined,
    };
  });
}

// Enriches getConversations results with unread counts in a single query
export async function getConversationsWithUnread(organizationId: string) {
  const conversations = await getConversations(organizationId);

  // Count unread customer messages per conversation (messages admin hasn't read)
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

  return conversations.map((conv) => ({
    ...conv,
    unreadCount: countMap.get(conv.id) ?? 0,
  }));
}

export async function markAsRead(
  conversationId: string,
  senderType: "customer" | "vendor",
) {
  const { ctx } = requestInfo;

  // Verify caller has access to this conversation
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (
    conversation.customerId !== ctx.user?.id &&
    conversation.organizationId !== ctx.currentOrganization?.id
  ) {
    throw new Error("Access denied");
  }

  // Mark messages from the OTHER senderType as read
  const otherSenderType = senderType === "customer" ? "vendor" : "customer";

  await db.message.updateMany({
    where: {
      conversationId,
      senderType: otherSenderType,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(
  organizationId: string,
  senderType: "customer" | "vendor",
) {
  const { ctx } = requestInfo;

  if (
    ctx.currentOrganization?.id !== organizationId
  ) {
    throw new Error("Access denied");
  }

  // Count messages from the OTHER senderType that haven't been read
  const otherSenderType = senderType === "customer" ? "vendor" : "customer";

  return db.message.count({
    where: {
      conversation: { organizationId },
      senderType: otherSenderType,
      readAt: null,
    },
  });
}

export async function resolveConversation(conversationId: string) {
  const { ctx } = requestInfo;

  if (!hasAdminAccess(ctx) || !ctx.currentOrganization) {
    throw new Error("Admin access required");
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.organizationId !== ctx.currentOrganization.id) {
    throw new Error("Conversation not found");
  }

  await db.conversation.update({
    where: { id: conversationId },
    data: { status: "resolved" },
  });
}
