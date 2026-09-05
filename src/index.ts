import { Hono } from "hono";
import type { Bindings } from "./types";
import { checkRequiredSecretsOnce } from "./lib/env";
import { setupDb } from "./lib/db";
import { homeRoutes } from "./features/home/routes";
import { healthRoutes } from "./features/health/routes";
import { showcaseRoutes } from "./features/showcase/routes";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => {
  checkRequiredSecretsOnce(c.env);
  await setupDb(c.env);
  await next();
});

app.route("/", homeRoutes);
app.route("/", healthRoutes);
app.route("/", showcaseRoutes);

export default app;
