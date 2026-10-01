import { db } from "@/lib/db";
import type { CatchUpdate } from "@/lib/db";
import type { CatchContent } from "./pipeline";

/** Powers the "currently live" preview on `GET /admin/catch` and the customer landing page (#58). */
export function getLiveCatchUpdate(): Promise<CatchUpdate | null> {
  return db.catchUpdate.findFirst({ where: { status: "live" }, orderBy: { createdAt: "desc" } });
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

/** Rewrites a live row's content — the "Prices & availability" correction path (#71), no new row/publish cycle. */
export function updateCatchContent(id: string, content: CatchContent): Promise<CatchUpdate> {
  return db.catchUpdate.update({ where: { id }, data: { formattedContent: JSON.stringify(content) } });
}
