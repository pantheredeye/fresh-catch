import { route } from "rwsdk/router";
import { AdminDashboard } from "./AdminDashboard";
import { SetupPage } from "./SetupPage";
import { MarketConfigPage } from "./MarketConfigPage";

export const adminRoutes = [
  route("/", AdminDashboard),        // /admin landing page
  route("/setup", SetupPage),        // /admin/setup
  route("/config", MarketConfigPage), // /admin/config
];