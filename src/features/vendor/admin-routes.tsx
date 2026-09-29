import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { SectionHeading } from "@/ui/section-heading";
import { BackLink } from "@/ui/back-link";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import { getVendor, updateVendor } from "./queries";
import { parseVendorForm } from "./validation";
import { VendorForm } from "./components";

export const vendorAdminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

vendorAdminRoutes.use("/admin/vendor", requireAdmin());

function formString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

vendorAdminRoutes.get("/admin/vendor", async (c) => {
  const vendor = await getVendor();
  return c.html(
    <Document title="Vendor settings — Admin">
      <Page>
        <BackLink href="/admin">Admin</BackLink>
        <SectionHeading title="Vendor settings" level={1} />
        <VendorForm
          csrfToken={c.var.session!.csrfToken}
          values={{ displayName: vendor?.displayName, phone: vendor?.phone }}
        />
      </Page>
    </Document>,
  );
});

vendorAdminRoutes.post("/admin/vendor", csrfProtect(), async (c) => {
  const vendor = await getVendor();
  if (!vendor) return c.text("No vendor configured", 500);

  const body = await c.req.parseBody();
  const result = parseVendorForm(body);
  if (!result.success) {
    return c.html(
      <Document title="Vendor settings — Admin">
        <Page>
          <BackLink href="/admin">Admin</BackLink>
          <SectionHeading title="Vendor settings" level={1} />
          <VendorForm
            csrfToken={c.var.session!.csrfToken}
            values={{ displayName: formString(body.displayName), phone: formString(body.phone) }}
            errors={result.errors}
          />
        </Page>
      </Document>,
      400,
    );
  }

  await updateVendor(vendor.id, result.data);
  return c.redirect("/admin/vendor");
});
