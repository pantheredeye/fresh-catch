import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { requireAdmin } from "@/features/auth/middleware";
import { countOpenRequests } from "@/features/requests/queries";

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.get("/admin", requireAdmin(), async (c) => {
  const openCount = await countOpenRequests();
  return c.html(
    <Document title="Admin — Fresh Catch">
      <main>
        <h1>Admin</h1>
        <p>Signed in as {c.var.session?.email}.</p>
        <p>
          <a href="/admin/markets">Markets</a>
        </p>
        <p>
          <a href="/admin/catch">Catch of the week</a>
        </p>
        <p>
          <a href="/admin/requests">Requests{openCount > 0 ? ` (${openCount} open)` : ""}</a>
        </p>
      </main>
    </Document>,
  );
});
