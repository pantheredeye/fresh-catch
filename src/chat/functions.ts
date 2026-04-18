"use server";

import { requestInfo, serverQuery } from "rwsdk/worker";
import { env } from "cloudflare:workers";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";

function notifyInbox(organizationId: string): void {
  try {
    const doId = env.INBOX_DURABLE_OBJECT.idFromName(organizationId);
    env.INBOX_DURABLE_OBJECT.get(doId).notify();
  } catch {}
}

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

export const getMessages = serverQuery(async (
  conversationId: string,
  cursor?: string,
) => {
  const { ctx } = requestInfo;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return { messages: [], nextCursor: null };
  }

  // Auth: anonymous conversations (customerId=null) use conversation ID as bearer token
  const isAnonymous = conversation.customerId === null;
  const isOwner = conversation.customerId !== null && conversation.customerId === ctx.user?.id;
  const isOrgMember = conversation.organizationId === ctx.currentOrganization?.id;
  if (!isAnonymous && !isOwner && !isOrgMember) {
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
});

export const getConversation = serverQuery(async (conversationId: string) => {
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

  // Auth: anonymous conversations (customerId=null) use conversation ID as bearer token
  const isAnonymous = conversation.customerId === null;
  const isOwner = conversation.customerId !== null && conversation.customerId === ctx.user?.id;
  const isOrgMember = conversation.organizationId === ctx.currentOrganization?.id;
  if (!isAnonymous && !isOwner && !isOrgMember) {
    return null;
  }

  // Return messages in chronological order
  conversation.messages.reverse();

  return conversation;
});

export const getConversations = serverQuery(async (organizationId: string) => {
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
});

// Enriches getConversations results with unread counts in a single query
export const getConversationsWithUnread = serverQuery(async (organizationId: string) => {
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
});

export async function markAsRead(
  conversationId: string,
  senderType: "customer" | "vendor",
) {
  const { ctx } = requestInfo;

  // Verify caller has access to this conversation
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return;

  // Auth: anonymous conversations (customerId=null) use conversation ID as bearer token
  const isAnonymous = conversation.customerId === null;
  const isOwner = conversation.customerId !== null && conversation.customerId === ctx.user?.id;
  const isOrgMember = conversation.organizationId === ctx.currentOrganization?.id;
  if (!isAnonymous && !isOwner && !isOrgMember) return;

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

  notifyInbox(conversation.organizationId);
}

export const getUnreadCount = serverQuery(async (
  organizationId: string,
  senderType: "customer" | "vendor",
) => {
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
});

export const getUnreadCountForConversation = serverQuery(async (
  conversationId: string,
  senderType: "customer" | "vendor",
) => {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return 0;

  // Conversation ID is the bearer token — no additional auth needed
  const otherSenderType = senderType === "customer" ? "vendor" : "customer";

  return db.message.count({
    where: {
      conversationId,
      senderType: otherSenderType,
      readAt: null,
    },
  });
});

export const conversationExists = serverQuery(async (conversationId: string) => {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });
  return !!conversation;
});

export async function saveCustomerEmail(
  conversationId: string,
  email: string,
) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return { success: false, error: "Conversation not found" };
  }

  await db.conversation.update({
    where: { id: conversationId },
    data: { customerEmail: email },
  });

  return { success: true };
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

  notifyInbox(conversation.organizationId);
}
