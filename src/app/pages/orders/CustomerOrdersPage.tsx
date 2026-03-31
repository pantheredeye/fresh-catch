import { RequestInfo, requestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { CustomerOrdersUI } from "./CustomerOrdersUI";
import { db } from "@/db";
import type { FeeModel } from "@/utils/money";

export async function CustomerOrdersPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  const url = new URL(requestInfo.request.url);
  const checkoutStatus = url.searchParams.get("checkout") as "success" | "cancel" | null;
  const checkoutOrder = url.searchParams.get("order") ? Number(url.searchParams.get("order")) : null;

  const orders = await db.order.findMany({
    where: {
      userId: ctx.user.id,
    },
    include: {
      organization: {
        select: { name: true, slug: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const feeModel: FeeModel = ctx.currentOrganization
    ? ((await db.organization.findUnique({
        where: { id: ctx.currentOrganization.id },
        select: { feeModel: true }
      }))?.feeModel ?? "customer") as FeeModel
    : "customer";

  return <CustomerOrdersUI orders={orders} ctx={ctx} feeModel={feeModel} checkoutStatus={checkoutStatus} checkoutOrder={checkoutOrder} />;
}
