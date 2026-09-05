import { Hono } from "hono";
import type { Bindings } from "../../types";
import { Document } from "../../ui/document";

export const homeRoutes = new Hono<{ Bindings: Bindings }>();

homeRoutes.get("/", (c) => {
  return c.html(
    <Document>
      <main>
        <h1>Fresh Catch</h1>
        <p>v2 foundation is up.</p>
      </main>
    </Document>,
  );
});
