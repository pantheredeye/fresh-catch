import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { SectionHeading } from "@/ui/section-heading";
import { Button } from "@/ui/button";
import { requireAdmin } from "@/features/auth/middleware";
import { countOpenRequests } from "@/features/requests/queries";

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.get("/admin", requireAdmin(), async (c) => {
  const openCount = await countOpenRequests();
  const session = c.var.session!;
  return c.html(
    <Document title="Admin — Fresh Catch">
      <Page>
        <SectionHeading title="Admin" level={1} />
        <p class="muted">Signed in as {session.email}.</p>
        <nav aria-label="Admin" class="stack">
          <a class="inbox-row" href="/admin/markets">
            Markets
          </a>
          <a class="inbox-row" href="/admin/catch">
            Catch of the week
          </a>
          <a class="inbox-row" href="/admin/requests">
            Requests{openCount > 0 ? ` (${openCount} open)` : ""}
          </a>
          <a class="inbox-row" href="/admin/vendor">
            Vendor settings
          </a>
        </nav>
        <form method="post" action="/logout">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <Button type="submit" variant="ghost" inline>
            Log out
          </Button>
        </form>
      </Page>
    </Document>,
  );
});
