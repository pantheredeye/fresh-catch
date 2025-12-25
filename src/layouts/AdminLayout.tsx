import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { AdminLayoutClient } from "./AdminLayoutClient";

export function AdminLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  const ctx = requestInfo?.ctx;
  const isAdmin = ctx?.currentOrganization?.role && ['owner', 'manager'].includes(ctx.currentOrganization.role);

  return (
    <AdminLayoutClient
      user={ctx?.user ?? null}
      currentOrganization={ctx?.currentOrganization ?? null}
      isAdmin={!!isAdmin}
    >
      {children}
    </AdminLayoutClient>
  );
}
