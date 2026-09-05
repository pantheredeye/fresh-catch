import { Hono } from "hono";
import type { Bindings, Variables } from "./types";
import { checkRequiredSecretsOnce } from "./lib/env";
import { setupDb } from "./lib/db";
import { deviceTokenMiddleware, sessionMiddleware } from "./features/auth/middleware";
import { homeRoutes } from "./features/home/routes";
import { healthRoutes } from "./features/health/routes";
import { showcaseRoutes } from "./features/showcase/routes";
import { authRoutes } from "./features/auth/routes";
import { adminRoutes } from "./features/admin/routes";
import { marketsAdminRoutes } from "./features/markets/admin-routes";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  checkRequiredSecretsOnce(c.env);
  await setupDb(c.env);
  await next();
});

app.use("*", deviceTokenMiddleware());
app.use("*", sessionMiddleware());

app.route("/", homeRoutes);
app.route("/", healthRoutes);
app.route("/", showcaseRoutes);
app.route("/", authRoutes);
app.route("/", adminRoutes);
app.route("/", marketsAdminRoutes);

export default app;
