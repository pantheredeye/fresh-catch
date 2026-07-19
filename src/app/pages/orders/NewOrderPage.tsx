import { RequestInfo } from "rwsdk/worker";
import { NewOrderUI } from "./NewOrderUI";

export function NewOrderPage({ ctx }: RequestInfo) {
  // Vendor must come from explicit browsing context (/v/:slug or ?b=)
  const vendor = ctx.browsingOrganization;

  if (!vendor) {
    return new Response("", { status: 302, headers: { Location: "/" } });
  }

  // Anonymous users see the form too — auth happens at submit via AuthSheet.
  const defaultContact = ctx.user
    ? {
        name: ctx.user.name || ctx.user.username,
        email: ctx.user.email || "",
        phone: ctx.user.phone || "",
      }
    : { name: "", email: "", phone: "" };

  return (
    <NewOrderUI
      csrfToken={ctx.user ? ctx.session!.csrfToken : null}
      vendorName={vendor.name}
      vendorId={vendor.id}
      vendorSlug={vendor.slug}
      defaultContact={defaultContact}
    />
  );
}
