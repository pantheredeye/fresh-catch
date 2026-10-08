import { db } from "@/lib/db";
import type { CatchUpdate } from "@/lib/db";
import { parseCatchContent, type CatchContent } from "./pipeline";

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

export interface RequestableCatchItem {
  name: string;
  /** Only when the live catch item carries a price tag — never invented (#103: prices optional). */
  priceCents?: number;
}

/** What a customer can request right now — the live, not-sold-out items (empty when no live catch). */
export async function listRequestableCatchItems(): Promise<RequestableCatchItem[]> {
  const live = await getLiveCatchUpdate();
  if (!live) return [];
  const content = parseCatchContent(live.formattedContent);
  if (!content) return [];
  return content.items
    .filter((item) => !item.soldOut)
    .map((item) => (item.priceCents !== undefined ? { name: item.name, priceCents: item.priceCents } : { name: item.name }));
}
