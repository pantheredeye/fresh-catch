import { Hono } from "hono";
import type { Bindings } from "./types";
import { checkRequiredSecretsOnce } from "./lib/env";
import { homeRoutes } from "./features/home/routes";
import { healthRoutes } from "./features/health/routes";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => {
  checkRequiredSecretsOnce(c.env);
  await next();
});

app.route("/", homeRoutes);
app.route("/", healthRoutes);

export default app;
