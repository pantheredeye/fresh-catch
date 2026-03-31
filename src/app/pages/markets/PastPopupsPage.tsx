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
  let orgId: string;

  if (ctx.browsingOrganization) {
    // Middleware resolved ?b=slug to an org
    orgId = ctx.browsingOrganization.id;
  } else {
    // Check if ?b= param was present but didn't resolve (invalid slug)
    const url = new URL(request.url);
    const businessSlug = url.searchParams.get('b');

    if (businessSlug) {
      return <BusinessNotFound businessSlug={businessSlug} />;
    }

    // No ?b= param: auto-detect single business
    const detectedOrgId = await getPublicOrganizationId();

    if (!detectedOrgId) {
      // Multiple businesses or none — past popups need a specific vendor
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
