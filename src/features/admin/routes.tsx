import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { requireAdmin } from "@/features/auth/middleware";

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.get("/admin", requireAdmin(), (c) => {
  return c.html(
    <Document title="Admin — Fresh Catch">
      <main>
        <h1>Admin</h1>
        <p>Signed in as {c.var.session?.email}.</p>
      </main>
    </Document>,
  );
});
