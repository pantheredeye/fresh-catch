import { RequestInfo } from "rwsdk/worker";
import { hasAdminAccess } from "@/utils/permissions";
import { pageRedirect } from "@/app/redirect";
import { Login } from "./Login";

/**
 * LoginPage - Server component wrapper for the client Login component
 */
export function LoginPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;

  // If already logged in, auto-redirect. Customers go home — only actual
  // admins go to /admin (an individual org is not admin access).
  if (ctx.user) {
    const url = new URL(requestInfo.request.url);
    const bSlug = url.searchParams.get("b");
    const base = hasAdminAccess(ctx) ? "/admin" : "/";
    const destination = bSlug ? `${base}?b=${bSlug}` : base;
    return pageRedirect(requestInfo, destination);
  }

  return <Login />;
}
