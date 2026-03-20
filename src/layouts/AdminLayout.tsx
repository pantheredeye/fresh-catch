import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { AdminLayoutClient } from "./AdminLayoutClient";
import { hasAdminAccess } from "@/utils/permissions";

export function AdminLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  const ctx = requestInfo?.ctx;
  const isAdmin = ctx ? hasAdminAccess(ctx) : false;

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
