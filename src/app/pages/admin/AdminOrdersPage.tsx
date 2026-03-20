import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { AdminOrdersUI } from "./AdminOrdersUI";
import { db } from "@/db";
import type { FeeModel } from "@/utils/money";
import { NotAuthenticated, AccessDenied, NoOrganization } from "./components";

export async function AdminOrdersPage({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  if (!ctx.currentOrganization) return <NoOrganization />;

  const orders = await db.order.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
      user: { deletedAt: null },
    },
    include: {
      user: {
        select: {
          username: true,
          name: true,
        }
      },
      organization: {
        select: {
          platformFeeBps: true,
          feeModel: true,
          defaultDepositBps: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  const typedOrders = orders.map(o => ({
    ...o,
    organization: o.organization
      ? { ...o.organization, feeModel: o.organization.feeModel as FeeModel }
      : undefined,
  }));

  return <AdminOrdersUI orders={typedOrders} ctx={ctx} />;
}
