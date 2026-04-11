"use server";

import { env } from "cloudflare:workers";
import { requestInfo, serverQuery } from "rwsdk/worker";
import { requireCsrf } from "@/session/csrf";
import type { InsightRow, EntityRow, SignalStatsRow } from "@/signal/durableObject";

function getStub() {
  const { ctx } = requestInfo;
  if (!ctx.currentOrganization) throw new Error("No org context");
  return env.SIGNAL_DURABLE_OBJECT.get(
    env.SIGNAL_DURABLE_OBJECT.idFromName(ctx.currentOrganization.id),
  );
}

export const refreshInsights = serverQuery(async (): Promise<InsightRow[]> => {
  return getStub().getInsights({ limit: 50 });
});

export const refreshEntities = serverQuery(async (): Promise<EntityRow[]> => {
  return getStub().getTopEntities({ days: 7, limit: 15 });
});

export const refreshStats = serverQuery(async (): Promise<SignalStatsRow[]> => {
  return getStub().getSignalStats({ days: 7 });
});

export async function markSeen(csrfToken: string, insightId: string): Promise<void> {
  requireCsrf(csrfToken);
  await getStub().markInsightSeen(insightId);
}
