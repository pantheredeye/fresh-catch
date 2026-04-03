"use server";

import { requestInfo } from "rwsdk/worker";

import { db } from "@/db";

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
