import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { hasAdminAccess } from "@/utils/permissions";
import { PrintOrdersUI } from "./PrintOrdersUI";
import { AccessDenied } from "./components";

export async function PrintOrdersPage() {
  const { ctx, request } = requestInfo;

  if (!hasAdminAccess(ctx)) return <AccessDenied />;

  // Get date from query param (default to today)
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  // Get orders for the target date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await db.order.findMany({
    where: {
      organizationId: ctx.currentOrganization!.id,
      preferredDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: {
        in: ['confirmed', 'completed']
      },
      user: { deletedAt: null }
    },
    include: {
      user: {
        select: {
          username: true,
          name: true
        }
      }
    },
    orderBy: {
      preferredDate: 'asc'
    }
  });

  return (
    <PrintOrdersUI
      orders={orders}
      date={targetDate}
      organizationName={ctx.currentOrganization!.name}
    />
  );
}
