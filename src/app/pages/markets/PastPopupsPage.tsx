import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { getPublicOrganizationId } from "@/utils/organization";
import { PastPopupsUI } from "./PastPopupsUI";
import { BusinessNotFound } from "../BusinessNotFound";

/**
 * PastPopupsPage - Server Component
 *
 * Public page showing expired/ended popup history.
 * Excludes cancelled popups (they never happened).
 */
export async function PastPopupsPage({ ctx, request }: RequestInfo) {
  const url = new URL(request.url);
  const businessSlug = url.searchParams.get('b');

  let orgId: string;

  if (businessSlug) {
    const org = await db.organization.findFirst({
      where: { slug: businessSlug, type: 'business' }
    });

    if (!org) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    orgId = org.id;
  } else {
    const detectedOrgId = await getPublicOrganizationId();

    if (!detectedOrgId) {
      return <BusinessNotFound businessSlug={null} />;
    }

    orgId = detectedOrgId;
  }

  const now = new Date();

  // Fetch past popups: ended (active=false) or naturally expired, but NOT cancelled
  const rawPopups = await db.market.findMany({
    where: {
      organizationId: orgId,
      type: "popup",
      cancelledAt: null,
      OR: [
        { active: false },
        { expiresAt: { lt: now } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  const popups = rawPopups.map(p => ({
    id: p.id,
    name: p.name,
    schedule: p.schedule,
    createdAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt?.toISOString() ?? "",
    locationDetails: p.locationDetails,
    catchPreview: p.catchPreview
  }));

  return <PastPopupsUI popups={popups} />;
}
