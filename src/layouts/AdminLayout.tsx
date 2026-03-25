import type { LayoutProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { AdminLayoutClient } from "./AdminLayoutClient";
import { hasAdminAccess, isOwner } from "@/utils/permissions";

export function AdminLayout({
  children,
  requestInfo,
}: LayoutProps<RequestInfo>) {
  const ctx = requestInfo?.ctx;

  return (
    <AdminLayoutClient
      user={ctx?.user ?? null}
      currentOrganization={ctx?.currentOrganization ?? null}
      isAdmin={ctx ? hasAdminAccess(ctx) : false}
      isOwner={ctx ? isOwner(ctx) : false}
    >
      {children}
    </AdminLayoutClient>
  );
}
