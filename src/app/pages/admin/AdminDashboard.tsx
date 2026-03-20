import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { AdminDashboardUI } from "./AdminDashboardUI";
import { NotAuthenticated, AccessDenied } from "./components";

export function AdminDashboard({ ctx }: RequestInfo) {
  if (!ctx.user) return <NotAuthenticated />;
  if (!hasAdminAccess(ctx)) return <AccessDenied />;
  return <AdminDashboardUI ctx={ctx} />;
}
