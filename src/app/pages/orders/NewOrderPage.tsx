import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { NewOrderUI } from "./NewOrderUI";

export function NewOrderPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  // Resolve vendor: browsingOrganization (from /v/:slug or ?b=) > currentOrganization (session, business only)
  const vendor = ctx.browsingOrganization ??
    (ctx.currentOrganization?.type === 'business' ? ctx.currentOrganization : null);

  if (!vendor) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const defaultContact = {
    name: ctx.user.name || ctx.user.username,
    phone: ctx.user.phone || ''
  };

  return <NewOrderUI vendorName={vendor.name} defaultContact={defaultContact} />;
}
