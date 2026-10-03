import { Hono } from "hono";
import type { Bindings } from "../../types";

export const healthRoutes = new Hono<{ Bindings: Bindings }>();

healthRoutes.get("/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 as ok").first<{ ok: number }>();
  return c.json({ ok: row?.ok === 1 });
});
