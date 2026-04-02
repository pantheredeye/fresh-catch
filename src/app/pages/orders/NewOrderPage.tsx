import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { NewOrderUI } from "./NewOrderUI";

export function NewOrderPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  // Vendor must come from explicit browsing context (/v/:slug or ?b=)
  const vendor = ctx.browsingOrganization;

  if (!vendor) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const defaultContact = {
    name: ctx.user.name || ctx.user.username,
    phone: ctx.user.phone || ''
  };

  return <NewOrderUI vendorName={vendor.name} vendorId={vendor.id} defaultContact={defaultContact} />;
}
