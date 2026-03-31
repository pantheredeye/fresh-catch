import { db } from "@/db";

const STALE_DAYS = 7;

export function getQuickActions(vendorSlug?: string) {
  const orderHref = vendorSlug ? `/orders/new?b=${vendorSlug}` : "/orders/new";
  return [
    { icon: "🐟", title: "Quick Order", href: orderHref },
    { icon: "📋", title: "My Orders", href: "/orders" },
    { icon: "📍", title: "Markets", href: "#markets" },
    { icon: "💬", title: "Contact", href: "#text" }
  ];
}

export async function fetchVendorData(orgId: string) {
  // Fetch active regular markets
  const markets = await db.market.findMany({
    where: {
      organizationId: orgId,
      active: true,
      type: "regular"
    },
    orderBy: { name: "asc" }
  });

  // Fetch active popups (not cancelled, not expired)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rawPopups = await db.market.findMany({
    where: {
      organizationId: orgId,
      type: "popup",
      active: true,
      cancelledAt: null
    },
    orderBy: { expiresAt: "asc" }
  });

  // Filter: expiresAt is null OR >= start of today, then serialize dates
  const popups = rawPopups
    .filter(p => !p.expiresAt || p.expiresAt >= startOfToday)
    .map(p => ({
      id: p.id,
      name: p.name,
      schedule: p.schedule,
      expiresAt: p.expiresAt?.toISOString() ?? "",
      locationDetails: p.locationDetails,
      customerInfo: p.customerInfo,
      catchPreview: p.catchPreview
    }));

  // Fetch latest live catch update, with staleness check
  const catchUpdate = await db.catchUpdate.findFirst({
    where: { organizationId: orgId, status: "live" },
    orderBy: { createdAt: "desc" },
  });

  const isStale = catchUpdate &&
    (Date.now() - new Date(catchUpdate.createdAt).getTime()) > STALE_DAYS * 86400000;

  const catchData = catchUpdate && !isStale
    ? {
        ...JSON.parse(catchUpdate.formattedContent),
        updatedAt: catchUpdate.createdAt.toISOString(),
      }
    : null;

  return { markets, popups, catchData };
}
