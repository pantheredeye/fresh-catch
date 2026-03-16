import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { CustomerOrdersUI } from "./CustomerOrdersUI";
import { db } from "@/db";
import type { FeeModel } from "@/utils/money";

export async function CustomerOrdersPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  if (!ctx.currentOrganization) {
    return (
      <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <p>No organization context available.</p>
      </div>
    );
  }

  const [orders, org] = await Promise.all([
    db.order.findMany({
      where: {
        userId: ctx.user.id,
        organizationId: ctx.currentOrganization.id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    db.organization.findUnique({
      where: { id: ctx.currentOrganization.id },
      select: { feeModel: true }
    })
  ]);

  const feeModel = (org?.feeModel ?? "customer") as FeeModel;

  return <CustomerOrdersUI orders={orders} ctx={ctx} feeModel={feeModel} />;
}
