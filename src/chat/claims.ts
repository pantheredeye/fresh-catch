import { db } from "@/db";

/**
 * Attach anonymous conversations to a user. Only fills customerId where it
 * is still null — never reassigns a conversation that already belongs to
 * someone. Knowing the conversation UUID is the ownership proof.
 */
export async function claimConversationsForUser(userId: string, conversationIds: string[]) {
  const ids = (Array.isArray(conversationIds) ? conversationIds : [])
    .filter((id) => typeof id === "string" && id.length > 0 && id.length <= 64)
    .slice(0, 20);
  if (ids.length === 0) return { claimed: 0 };

  const result = await db.conversation.updateMany({
    where: { id: { in: ids }, customerId: null },
    data: { customerId: userId },
  });

  return { claimed: result.count };
}
