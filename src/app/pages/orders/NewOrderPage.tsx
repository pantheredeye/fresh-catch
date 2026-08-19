import { RequestInfo } from "rwsdk/worker";
import { pageRedirect } from "@/app/redirect";
import { NewOrderUI } from "./NewOrderUI";

export function NewOrderPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;
  // Vendor must come from explicit browsing context (/v/:slug or ?b=)
  const vendor = ctx.browsingOrganization;

  if (!vendor) {
    return pageRedirect(requestInfo, "/");
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
