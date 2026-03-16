import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { Login } from "../user/Login";
import { AdminOrdersUI } from "./AdminOrdersUI";
import { db } from "@/db";
import type { FeeModel } from "@/utils/money";

export async function AdminOrdersPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  if (!hasAdminAccess(ctx)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--space-lg)',
        background: 'var(--color-surface-warm)'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-md)' }}>🔒</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            Admin Access Required
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-lg)'
          }}>
            You don't have permission to access admin tools.
          </p>
          <a href="/" style={{
            color: 'var(--color-action-primary)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 600
          }}>
            ← Back to Customer Portal
          </a>
        </div>
      </div>
    );
  }

  if (!ctx.currentOrganization) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--space-lg)',
        background: 'var(--color-surface-warm)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p>No organization context available.</p>
        </div>
      </div>
    );
  }

  const orders = await db.order.findMany({
    where: {
      organizationId: ctx.currentOrganization.id,
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
