import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { CustomerOrdersUI } from "./CustomerOrdersUI";
import { db } from "@/db";

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

  const orders = await db.order.findMany({
    where: {
      userId: ctx.user.id,
      organizationId: ctx.currentOrganization.id,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return <CustomerOrdersUI orders={orders} ctx={ctx} />;
}
