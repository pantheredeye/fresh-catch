import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { Page } from "@/ui/page";
import { requireAdmin } from "@/features/auth/middleware";
import { countOpenRequests } from "@/features/requests/queries";

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.get("/admin", requireAdmin(), async (c) => {
  const openCount = await countOpenRequests();
  return c.html(
    <Document title="Admin — Fresh Catch">
      <Page>
        <h1>Admin</h1>
        <p>Signed in as {c.var.session?.email}.</p>
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
        </nav>
      </Page>
    </Document>,
  );
});
