import { RequestInfo, requestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { CustomerOrdersUI } from "./CustomerOrdersUI";
import { GuestOrderConfirmation } from "./components";
import { db } from "@/db";
import type { FeeModel } from "@/utils/money";

export async function CustomerOrdersPage({ ctx }: RequestInfo) {
  const url = new URL(requestInfo.request.url);
  const checkoutStatus = url.searchParams.get("checkout") as "success" | "cancel" | null;
  const checkoutOrder = url.searchParams.get("order") ? Number(url.searchParams.get("order")) : null;

  if (!ctx.user) {
    if (checkoutStatus === "success" || checkoutStatus === "cancel") {
      return <GuestOrderConfirmation status={checkoutStatus} />;
    }
    return <Login navigate="reload" />;
  }

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

  // Fee model defaults to "customer" — per-order feeModel is a future enhancement
  const feeModel: FeeModel = "customer";

  return <CustomerOrdersUI orders={orders} ctx={ctx} csrfToken={ctx.session!.csrfToken} feeModel={feeModel} checkoutStatus={checkoutStatus} checkoutOrder={checkoutOrder} />;
}
