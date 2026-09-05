import { db } from "@/lib/db";
import type { CatchUpdate } from "@/lib/db";

/** Powers the "currently live" preview on `GET /admin/catch` and the customer landing page (#58). */
export function getLiveCatchUpdate(): Promise<CatchUpdate | null> {
  return db.catchUpdate.findFirst({ where: { status: "live" }, orderBy: { createdAt: "desc" } });
}

const CATCH_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * #58's 7-day staleness cutoff: a "live" row can sit unpublished for weeks if
 * Evan forgets to record a new one, so the landing page treats an old catch
 * as "no current catch" rather than showing week-old stock as fresh.
 */
export function isCatchUpdateFresh(catchUpdate: Pick<CatchUpdate, "createdAt">, now = new Date()): boolean {
  return now.getTime() - catchUpdate.createdAt.getTime() < CATCH_STALE_AFTER_MS;
}

export interface PublishCatchData {
  recordedBy: string | null;
  rawTranscript: string;
  formattedContent: string;
}

/** Archives any currently-live row, then inserts the new one as live — never more than one live row. */
export async function publishCatchUpdate(data: PublishCatchData): Promise<CatchUpdate> {
  await db.catchUpdate.updateMany({ where: { status: "live" }, data: { status: "archived" } });
  return db.catchUpdate.create({ data: { ...data, status: "live" } });
}
