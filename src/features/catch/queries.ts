import { db } from "@/lib/db";
import type { CatchUpdate } from "@/lib/db";

/** Powers the "currently live" preview on `GET /admin/catch` (and, later, the customer landing page in #58). */
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
